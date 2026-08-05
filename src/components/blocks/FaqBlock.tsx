import type { FaqContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import LayoutWidths from "./shared/LayoutWidths";
import { getPublicFaqs, type PageFaq } from "@/lib/website-builder/faqs";

/**
 * FAQ block — async server component. The questions/answers are specific to
 * the page it renders on (looked up from page_faqs by pageId), so one block
 * on a template yields a different FAQ set per page/post.
 *
 * Machine-visibility is the whole point of this block, so:
 *   - It renders on the SERVER: every Q&A is in the HTML the crawler
 *     receives, not fetched later by JS.
 *   - The non-featured answers sit in a NATIVE <details> panel — hidden from
 *     the eye until clicked, but present in the page source for Google/LLMs.
 *   - It emits FAQPage JSON-LD (all Q&A) so machines parse the pairs
 *     unambiguously.
 *
 * Only APPROVED pages render (getPublicFaqs gates on it), so a crawler never
 * hits an ungenerated/unreviewed page.
 *
 * `preview` (admin block-preview only) renders SAMPLE questions so the
 * design is visible in the block editor with no real page attached. Sample
 * content never reaches a public page — public renders always go through the
 * pageId path and are gated on approval, and no JSON-LD is emitted for
 * samples so they can't be mistaken for real structured data.
 */

/** Placeholder Q&A used only for the admin design preview. */
const SAMPLE_FAQS: PageFaq[] = [
  {
    id: "sample-1",
    question: "Where is Anamaya located?",
    answer:
      "Anamaya sits on a clifftop above Montezuma, on Costa Rica's Nicoya Peninsula, overlooking the Pacific.",
    is_featured: true,
    sort_order: 0,
    source: "manual",
  },
  {
    id: "sample-2",
    question: "What's included in a stay?",
    answer:
      "Your accommodation, daily gourmet meals, yoga classes, and access to the pool, spa, and grounds are all included.",
    is_featured: true,
    sort_order: 1,
    source: "manual",
  },
  {
    id: "sample-3",
    question: "How do I get there from the airport?",
    answer:
      "Most guests fly into San José or Liberia, then reach Montezuma by a short domestic flight, shuttle, or the ferry across the Gulf of Nicoya.",
    is_featured: true,
    sort_order: 2,
    source: "manual",
  },
  {
    id: "sample-4",
    question: "Do you offer yoga teacher training?",
    answer:
      "Yes. Anamaya runs 200-hour Yoga Teacher Trainings several times a year, led by experienced guest teachers.",
    is_featured: false,
    sort_order: 3,
    source: "manual",
  },
  {
    id: "sample-5",
    question: "Is Anamaya a good fit for solo travelers?",
    answer:
      "Very much so. Many guests arrive on their own and connect quickly over shared meals and daily classes.",
    is_featured: false,
    sort_order: 4,
    source: "manual",
  },
];

export default async function FaqBlock({
  content,
  pageId,
  preview,
}: {
  content: FaqContent;
  pageId?: string;
  /** Admin block-preview only: render sample questions so the design shows
   *  with no real page attached. Never set on public render paths. */
  preview?: boolean;
}) {
  const c = content ?? {};
  const heading = c.heading ?? "Frequently Asked Questions";
  const subheading = c.subheading ?? "";
  const moreLabel = c.more_label ?? "More questions";
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;

  // Resolve the Q&A set: sample in the admin preview, otherwise this page's
  // approved FAQs.
  let featured: PageFaq[];
  let more: PageFaq[];
  const isSample = !!preview;
  if (isSample) {
    featured = SAMPLE_FAQS.filter((f) => f.is_featured);
    more = SAMPLE_FAQS.filter((f) => !f.is_featured);
  } else {
    // No page context (a stray single-block surface): show a hint instead of
    // rendering blank, so the editor isn't confused by an empty box.
    if (!pageId) {
      return (
        <section className="w-full" style={{ paddingTop: padY, paddingBottom: padY }}>
          <LayoutWidths content={c} defaultMaxContentPx={c.container_width_px ?? 820}>
            <p className="rounded-md border border-dashed border-anamaya-charcoal/20 bg-white/40 p-8 text-center text-sm italic opacity-60">
              FAQs are specific to each page. Add this block to a page or post to
              generate and show its questions here.
            </p>
          </LayoutWidths>
        </section>
      );
    }
    const res = await getPublicFaqs(pageId);
    featured = res.featured;
    more = res.more;
    // Nothing approved for this page yet: render nothing on the public site.
    if (featured.length === 0 && more.length === 0) return null;
  }

  const all = [...featured, ...more];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color: textColor, paddingTop: padY, paddingBottom: padY }}
    >
      {/* Structured data — an unambiguous Q&A signal for Google/LLMs. Never
          emitted for sample previews. */}
      {!isSample && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LayoutWidths content={c} defaultMaxContentPx={c.container_width_px ?? 820}>
        {isSample && (
          <p className="mb-6 rounded-md border border-dashed border-anamaya-charcoal/25 bg-white/50 px-4 py-2 text-center text-xs italic text-anamaya-charcoal/60">
            Sample preview — on a real page these questions are generated from
            that page&rsquo;s own content and reviewed before publishing.
          </p>
        )}
        <header className="mb-8 text-center">
          {heading && (
            <h2
              className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl"
              style={{ color: headingColor }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed opacity-80">
              {subheading}
            </p>
          )}
        </header>

        <div className="mx-auto max-w-3xl">
          {/* Featured: always open. */}
          {featured.map((f) => (
            <FaqItem key={f.id} faq={f} defaultOpen />
          ))}

          {/* The rest: tucked in a collapsible panel, still in the page
              source so machines read them. */}
          {more.length > 0 && (
            <details className="mt-4 border-t border-anamaya-charcoal/10 pt-4">
              <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.15em] text-anamaya-charcoal/70 hover:text-anamaya-charcoal">
                {moreLabel} ({more.length})
              </summary>
              <div className="mt-3">
                {more.map((f) => (
                  <FaqItem key={f.id} faq={f} />
                ))}
              </div>
            </details>
          )}
        </div>
      </LayoutWidths>
    </section>
  );
}

/** A single question/answer as a native accordion row. */
function FaqItem({ faq, defaultOpen }: { faq: PageFaq; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="border-b border-anamaya-charcoal/10 py-3"
    >
      <summary className="cursor-pointer list-none text-lg font-medium leading-snug text-anamaya-charcoal marker:hidden">
        {faq.question}
      </summary>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-anamaya-charcoal/80">
        {faq.answer}
      </p>
    </details>
  );
}
