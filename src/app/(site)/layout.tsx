import AppShell from "@/components/AppShell";
import { getSessionUser } from "@/lib/session";

// Wraps all public marketing pages with Header + Footer + SideMenu.
// /auth/* and /admin/* live outside this group so they render without the chrome.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read session once per request and pass the user to the (client) Header
  // so it can show sign-in or the name+avatar.
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell user={user}>{children}</AppShell>
    </div>
  );
}
