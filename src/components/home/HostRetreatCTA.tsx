import Link from "next/link";

// Real masthead photo from v2 Supabase Storage
const MASTHEAD_BG =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2021/03/masthead30-scaled-30.webp";

export default function HostRetreatCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${MASTHEAD_BG})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-anamaya-charcoal/60" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Looking for a location in Costa Rica to host your own retreat?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90">
          Whether you&rsquo;re a yoga teacher, a life coach, a wellness
          entrepreneur, or provide other transformational experiences –
          Anamaya Resort provides the perfect backdrop to host a retreat or
          training that will not only elevate your brand but also enrich lives.
        </p>
        <Link
          href="/host-your-own-retreat-at-anamaya/"
          className="mt-8 inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}
