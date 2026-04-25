// Auth is enforced by middleware. This layout exists so the (default) and
// website route groups can render distinct chrome without one wrapping the
// other.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
