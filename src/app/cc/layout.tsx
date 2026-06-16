import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/session-shared";
import { getSSOLoginUrl } from "@/config/sso";

export const metadata: Metadata = {
  title: "Collaborator Console — Anamaya",
  robots: { index: false, follow: false },
};

/**
 * cc.anamaya.com / `/cc` — the Collaborator Console.
 *
 * SSO-gated here in the layout (server component) rather than in `proxy.ts`,
 * so this whole feature is self-contained and the owner-only proxy stays
 * untouched. Only LightningWorks admins/superadmins get in; everyone else is
 * bounced to the same SSO login the rest of the site uses. The owner can
 * additionally add `/cc` to the proxy matcher for edge-level gating — see
 * `src/app/cc/README.md`.
 */
export default async function CollaboratorConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !isAdminRole(session.user.role)) {
    const h = await headers();
    const host = h.get("host") ?? "test.anamaya.com";
    const proto = h.get("x-forwarded-proto") ?? "https";
    redirect(getSSOLoginUrl(`${proto}://${host}/cc`));
  }

  const user = session.user;
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="min-h-full bg-anamaya-brand-subtle text-anamaya-charcoal">
      <header className="border-b border-anamaya-brand-divider/40 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-7 w-7 rounded-lg bg-anamaya-brand-btn" aria-hidden />
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">Collaborator Console</div>
              <div className="text-xs text-anamaya-charcoal/60">Anamaya website · safe workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline ${
                configured
                  ? "bg-anamaya-green/15 text-anamaya-olive-dark"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {configured ? "Staging · live" : "Staging · setup pending"}
            </span>
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-anamaya-brand-divider/40"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-anamaya-brand-btn/15 text-sm font-semibold text-anamaya-brand-btn">
                  {(user.display_name || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-sm text-anamaya-charcoal/80 sm:inline">
                {user.display_name || user.username}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
