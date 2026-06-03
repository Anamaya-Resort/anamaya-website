import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { runChat, type ChatMessage } from "@/lib/ai/client";
import { getAvailableModels } from "@/lib/ai/providers";
import { getOrganizationContext } from "@/lib/ai/organization";
import { SESSION_COOKIE } from "@/config/sso";
import { unsealSession } from "@/lib/session-edge";
import { isAdminRole } from "@/lib/session-shared";

// Admin-only generator for Technical docs (robots / sitemap notes / schema /
// meta). NOT proxy-gated (api routes are excluded), so it checks the SSO
// session itself. Reuses the same model picker + runChat as the visitor agent.

type Body = { docType?: string; prompt?: string };

const GUIDANCE: Record<string, string> = {
  robots:
    "Produce a complete robots.txt. Allow normal crawling, disallow /admin, /api, /snapshot and /auth, and include a Sitemap: https://anamaya.com/sitemap.xml line.",
  schema:
    "Produce ONE <script type=\"application/ld+json\"> block of valid Schema.org JSON-LD describing this organization site-wide (use @graph with Organization and the most specific business type that fits, e.g. Resort/LodgingBusiness, plus WebSite). Use the org details provided. No comments, no trailing text.",
  meta:
    "Produce a concise default meta description (<=155 chars) and, on a second line prefixed 'OG: ', a one-line Open Graph description. Plain text only.",
  sitemap:
    "List any additional absolute URLs (one per line) that should be in the sitemap beyond the auto-discovered pages. Plain text, one URL per line.",
  tracking:
    "Produce only the raw HTML snippet(s) requested for the site <head> or footer. No explanation.",
};

export async function POST(req: Request) {
  // Auth: require an admin SSO session.
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = sealed ? await unsealSession(sealed) : null;
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }
  const docType = String(body.docType ?? "");
  const prompt = String(body.prompt ?? "").trim();
  const guidance = GUIDANCE[docType];
  if (!guidance) return NextResponse.json({ ok: false, reason: "Unknown docType" }, { status: 400 });

  const models = await getAvailableModels("text");
  if (!models.defaultRef) {
    return NextResponse.json({ ok: false, reason: "No active text model configured." }, { status: 503 });
  }

  // Ground the generation in the synced organization profile.
  const ctx = await getOrganizationContext();
  const orgLines = ctx
    ? [
        `Name: ${ctx.org.name}`,
        ctx.org.legal_name && `Legal name: ${ctx.org.legal_name}`,
        ctx.org.tagline && `Tagline: ${ctx.org.tagline}`,
        ctx.org.primary_offering && `Offering: ${ctx.org.primary_offering}`,
        ctx.org.booking_url && `Booking URL: ${ctx.org.booking_url}`,
        ctx.org.contact_url && `Contact URL: ${ctx.org.contact_url}`,
        `Site: https://anamaya.com`,
      ].filter(Boolean).join("\n")
    : "Site: https://anamaya.com";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `You generate machine-facing website files. ${guidance}\n` +
        `Output ONLY the file content with no markdown fences and no commentary.\n\n` +
        `Organization details:\n${orgLines}`,
    },
    { role: "user", content: prompt || "Generate it from the organization details above." },
  ];

  const result = await runChat({ modelRef: models.defaultRef, messages, maxTokens: 1500 });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });

  // Strip accidental code fences just in case.
  const text = result.text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  return NextResponse.json({ ok: true, text });
}
