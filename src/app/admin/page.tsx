import Link from "next/link";

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-anamaya-charcoal">Welcome</h1>
      <p className="mt-2 text-sm text-anamaya-charcoal/70">
        Pick a content type to manage.
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link
            href="/admin/blocks"
            className="block rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">Blocks</h2>
            <p className="mt-1 text-sm text-anamaya-charcoal/70">
              Reusable content blocks (press bar, hero, CTA, rich text).
              Edit once — updates flow through to every page that uses them.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/testimonials"
            className="block rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">Testimonials</h2>
            <p className="mt-1 text-sm text-anamaya-charcoal/70">
              Add TripAdvisor-style guest reviews and organize them into sets
              for each page.
            </p>
          </Link>
        </li>
        <li className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-anamaya-charcoal/50">
          Retreats &mdash; coming soon
        </li>
        <li className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-anamaya-charcoal/50">
          Accommodations &mdash; coming soon
        </li>
      </ul>
    </div>
  );
}
