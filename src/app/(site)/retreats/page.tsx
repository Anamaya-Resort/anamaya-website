import Link from "next/link";
import type { Metadata } from "next";
import { listRetreats } from "@/lib/retreats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yoga Retreats in Costa Rica — Anamaya",
  description:
    "Customizable yoga and wellness retreats at Anamaya Resort, a clifftop eco-lodge in Montezuma, Costa Rica. Week-long transformational experiences led by world-class facilitators.",
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function RetreatsIndex() {
  const retreats = await listRetreats();

  return (
    <>
      <section className="bg-anamaya-cream px-6 py-16 pt-28 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-anamaya-charcoal sm:text-5xl">
            Yoga Retreats in Costa Rica
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-anamaya-charcoal/80">
            Week-long transformational experiences on a Pacific clifftop above
            Montezuma. Customizable wellness, yoga, and breathwork retreats led
            by world-class facilitators.
          </p>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          {retreats.length === 0 ? (
            <p className="text-center text-anamaya-charcoal/60">
              No retreats are currently published.
            </p>
          ) : (
            <>
              <p className="mb-10 text-center text-sm text-anamaya-charcoal/60">
                Showing {retreats.length} retreat{retreats.length === 1 ? "" : "s"}
              </p>
              <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {retreats.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/retreat/${r.slug}`}
                      className="group block overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-anamaya-charcoal/10 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-anamaya-green to-anamaya-teal">
                        {r.featured_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.featured_image_url}
                            alt={r.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        {r.category && (
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-anamaya-olive">
                            {r.category}
                          </p>
                        )}
                        <h2 className="text-xl font-semibold leading-snug text-anamaya-charcoal">
                          {r.title}
                        </h2>
                        {r.excerpt && (
                          <p className="mt-3 text-sm leading-relaxed text-anamaya-charcoal/75 line-clamp-4">
                            {r.excerpt}
                          </p>
                        )}
                        <div className="mt-6 flex items-center justify-between text-xs text-anamaya-charcoal/60">
                          <span>{fmtDate(r.date_modified) ?? ""}</span>
                          <span className="font-semibold text-anamaya-green group-hover:text-anamaya-green-dark">
                            Read more →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
