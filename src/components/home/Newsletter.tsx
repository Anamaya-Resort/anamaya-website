// "don't miss a thing..." newsletter block — replicates v2:
//   - lowercase heading with ellipsis
//   - Sereenly lead-capture iframe (same form id as v2, so submissions
//     still land in the existing email list)
//   - opt-in lifestyle photo on the left on desktop, above the form on mobile
//
// Form host: https://link.sereenly.com  |  form id: 3VbotiuGfLgRUdIpi2ro

const SEREENLY_FORM_SRC =
  "https://link.sereenly.com/widget/form/3VbotiuGfLgRUdIpi2ro";

const OPT_IN_IMAGE =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2019/07/opt-in.webp";

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

          <div className="overflow-hidden rounded-lg bg-white shadow-lg">
            <iframe
              title="Anamaya Newsletter Signup"
              src={SEREENLY_FORM_SRC}
              className="h-[420px] w-full border-0"
              loading="lazy"
              allow="autoplay; encrypted-media; gyroscope;"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
