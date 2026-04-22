import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold tracking-tight text-anamaya-charcoal">
              Anamaya Admin
            </Link>
            <Link href="/admin/testimonials" className="text-sm text-anamaya-charcoal/70 hover:text-anamaya-charcoal">
              Testimonials
            </Link>
          </div>
          <Link href="/" className="text-sm text-anamaya-charcoal/60 hover:text-anamaya-charcoal">
            ← Back to site
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
