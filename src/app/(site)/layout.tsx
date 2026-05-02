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

  // Site chrome (top bar + side menu + agent overlays) and the site
  // footer (main + legal strip) are both driven by their own
  // page_templates. Rendering them server-side here means the markup
  // ships in the SSR response and can be edited per-template without
  // touching layout code.
  const chrome = <TemplateRenderer templateSlug="site_chrome" />;
  const footer = <TemplateRenderer templateSlug="site_footer" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={user} chrome={chrome} footer={footer}>{children}</AppShell>
    </div>
  );
}
