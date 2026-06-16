import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/session-shared";

/**
 * POST /api/cc/agent — backend for the Collaborator Console.
 *
 * Security: re-checks the SSO admin session here (defense-in-depth — never
 * trust the page-level gate alone). Collaborator sessions are STAGING-only;
 * the production database ref is never made available to this route.
 *
 * Status: SCAFFOLD. The chat UI and auth are wired and testable today. The
 * agent runtime itself (Claude Agent SDK running inside a Cloudflare Sandbox
 * against the partner's branch + staging DB) is the final step and needs two
 * owner-provided credentials — see `src/app/cc/README.md`:
 *   • ANTHROPIC_API_KEY      — the one shared business key
 *   • CC_SANDBOX_* / CF token — Cloudflare Sandbox runtime
 * Until ANTHROPIC_API_KEY is set, this returns a friendly setup message so the
 * UI is fully demoable without making real changes.
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
        "The console is set up and you're logged in correctly, but the part that " +
        "actually does the work isn't connected yet. The owner needs to finish a " +
        "one-time setup (connect the shared AI key and the sandbox). Once that's " +
        "done, I'll open a private branch for you, make the change against the " +
        "staging site, and show you a preview link — all without touching the live " +
        "site or bookings.",
    });
  }

  // ── Agent runtime integration point ──────────────────────────────────────
  // When ANTHROPIC_API_KEY is present, hand the conversation to a sandboxed
  // Claude Agent SDK run scoped to this collaborator's branch + staging env.
  // Intentionally not imported until the dependency + Cloudflare Sandbox are
  // provisioned (keeps the build dependency-free). Wiring steps live in
  // src/app/cc/README.md.
  return NextResponse.json({
    configured: true,
    reply:
      "The shared AI key is connected, but the sandbox runtime that runs me " +
      "against your branch isn't deployed yet (the last setup step). " +
      "See src/app/cc/README.md.",
  });
}
