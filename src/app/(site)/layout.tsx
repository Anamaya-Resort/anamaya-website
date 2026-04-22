import AppShell from "@/components/AppShell";

// Wraps all public marketing pages with Header + Footer + SideMenu.
// /auth/* and /admin/* live outside this group so they render without the chrome.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppShell>{children}</AppShell>
    </div>
  );
}
