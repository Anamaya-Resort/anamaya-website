import AppShell from "@/components/AppShell";
import TemplateRenderer from "@/components/templates/TemplateRenderer";
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

  // Site chrome overlays (top bar + side menu + agent) come from the
  // site_chrome template and live in the AppShell's chrome slot —
  // overlays sit fixed-position on top of content, so they belong to
  // every page automatically.
  //
  // The footer is NOT a global slot. Each page template owns its own
  // footer by including the ui_footer_main / ui_footer_legal blocks
  // directly. site_footer remains as a canonical default the editor
  // can copy blocks from, but isn't auto-rendered here.
  const chrome = <TemplateRenderer templateSlug="site_chrome" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={user} chrome={chrome}>{children}</AppShell>
    </div>
  );
}
