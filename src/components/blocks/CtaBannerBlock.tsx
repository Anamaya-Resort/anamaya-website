import Link from "next/link";
import type { CtaBannerContent } from "@/types/blocks";

export default function CtaBannerBlock({ content }: { content: CtaBannerContent }) {
  return (
    <section className="relative overflow-hidden px-6 py-24 text-white">
      {content.bg_image_url ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${content.bg_image_url})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-anamaya-charcoal/60" aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0 bg-anamaya-charcoal" aria-hidden="true" />
      )}
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.heading}
        </h2>
        {content.subheading && (
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90">
            {content.subheading}
          </p>
        )}
        {content.cta?.href && content.cta?.label && (
          <Link
            href={content.cta.href}
            className="mt-8 inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            {content.cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
