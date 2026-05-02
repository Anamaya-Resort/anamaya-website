import AppShell from "@/components/AppShell";
import { getSessionUser } from "@/lib/session";

// Wraps all public marketing pages with Header + Footer + SideMenu.
// /auth/* and /admin/* live outside this group so they render without the chrome.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read session once per request and pass the user to the (client) AppShell
  // so chrome overlays can show sign-in / name+avatar via ChromeContext.
  const user = await getSessionUser();

  // Nothing is rendered here globally any more. Every chrome element —
  // top bar, side menu, agent overlay, footer — is a regular block
  // that lives inside whatever page_template the page is using. The
  // site_chrome and site_footer templates still exist as canonical
  // defaults the editor can copy blocks from.
  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={user}>{children}</AppShell>
    </div>
  );
}
