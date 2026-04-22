// "don't miss a thing..." newsletter block — replicates v2:
//   - lowercase heading with ellipsis
//   - Sereenly lead-capture iframe (same form id as v2)
//   - opt-in lifestyle photo on the left on desktop, above the form on mobile

import SereenlyForm from "@/components/SereenlyForm";

const HOME_NEWSLETTER_FORM_ID = "3VbotiuGfLgRUdIpi2ro";
// Optimized: 30 KB webp served from /public.
const OPT_IN_IMAGE = "/yoga_shala.webp";

export default function Newsletter() {
  return (
    <section className="bg-anamaya-cream px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-wide text-anamaya-charcoal sm:text-4xl">
            don&rsquo;t miss a thing...
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-anamaya-charcoal/80">
            Want to receive our emails for special promotions, discounts, and
            first-time access?
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={OPT_IN_IMAGE}
              alt="Anamaya Resort — don't miss a thing"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="rounded-lg bg-white shadow-lg">
            <SereenlyForm
              formId={HOME_NEWSLETTER_FORM_ID}
              title="Anamaya Newsletter Signup"
              formName="Newsletter Home Page"
              initialHeight={402}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
