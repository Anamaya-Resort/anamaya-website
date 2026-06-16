import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/session-shared";

/**
 * POST /api/admin/ai-site-builder/agent — backend for the AI Site Builder tool.
 *
 * Security: /admin is already SSO-gated by proxy.ts, but we re-check the admin
 * session here too (never trust a single layer). Sessions are STAGING-only;
 * the production database ref is never exposed to this route.
 *
 * Status: SCAFFOLD. The chat UI and auth are wired and testable today. The
 * agent runtime (Claude Agent SDK running inside a Vercel Sandbox against a
 * fresh branch + staging content) is the final step. It needs ONE credential —
 * `ANTHROPIC_API_KEY` in the Vercel env — plus the two runtime deps installed
 * (@vercel/sandbox + the Agent SDK). Everything runs on Vercel; Cloudflare is
 * not involved. See `src/app/admin/website/ai-site-builder/README.md`.
 * Until ANTHROPIC_API_KEY is set, this returns a friendly setup message so the
 * tool is fully demoable without making real changes.
 */

type Body = { messages?: { role: string; content: string }[] };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
  const ask = (lastUser?.content ?? "").trim();

  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!configured) {
    return NextResponse.json({
      configured: false,
      reply:
        "Thanks — I've got your request:\n\n" +
        `“${ask || "(empty)"}”\n\n` +
        "You're logged in correctly and the tool is set up, but the part that " +
        "actually does the work isn't connected yet. The owner needs to finish a " +
        "one-time setup (connect the shared AI key and the sandbox). Once that's " +
        "done, I'll open a branch, make the change against the staging content, " +
        "and show you a preview — all without touching the live site or bookings.",
    });
  }

  // ── Agent runtime integration point ──────────────────────────────────────
  // With ANTHROPIC_API_KEY present, hand the conversation to a Vercel Sandbox
  // running the Claude Agent SDK, scoped to a fresh branch + staging env. Not
  // imported until the runtime deps are installed (keeps the build
  // dependency-free). Wiring steps live in the README beside this tool.
  return NextResponse.json({
    configured: true,
    reply:
      "The shared AI key is connected, but the Vercel Sandbox runtime that runs " +
      "me against a branch isn't deployed yet (the last setup step). See the " +
      "README beside the AI Site Builder tool.",
  });
}
