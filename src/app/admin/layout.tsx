import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "@/modules/auth/sign-out-button";
import UserAvatar from "@/components/UserAvatar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware guarantees we're authenticated + have admin role by this point.
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-zinc-100">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-tight text-anamaya-charcoal"
            >
              Anamaya Admin
            </Link>
            <Link
              href="/admin/templates"
              className="text-sm text-anamaya-charcoal/70 hover:text-anamaya-charcoal"
            >
              Templates
            </Link>
            <Link
              href="/admin/blocks"
              className="text-sm text-anamaya-charcoal/70 hover:text-anamaya-charcoal"
            >
              Blocks
            </Link>
            <Link
              href="/admin/testimonials"
              className="text-sm text-anamaya-charcoal/70 hover:text-anamaya-charcoal"
            >
              Testimonials
            </Link>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
            >
              ← Back to site
            </Link>
            <SignOutButton />
            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm font-medium text-anamaya-charcoal sm:inline-block">
                  {user.display_name || user.username || user.email}
                </span>
                <UserAvatar user={user} ringColor="white" />
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
