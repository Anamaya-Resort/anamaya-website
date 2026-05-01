import AppShell from "@/components/AppShell";
import VisitorAgent from "@/components/ai/VisitorAgent";
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

  // Site-chrome overlays (top bar + side menu) come from the
  // `site_chrome` template. Rendering them server-side here means the
  // markup ships in the SSR response and can be edited per-template
  // without touching layout code.
  const chrome = <TemplateRenderer templateSlug="site_chrome" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={user} chrome={chrome}>{children}</AppShell>
      <VisitorAgent />
    </div>
  );
}
