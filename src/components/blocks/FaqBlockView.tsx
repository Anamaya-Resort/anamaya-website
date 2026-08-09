import type { FaqContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Presentational FAQ markup, shared by:
 *   - FaqBlock (server): resolves this page's approved Q&A + emits JSON-LD,
 *     then renders this view.
 *   - LivePreview (client, block editor): renders this view inline with sample
 *     Q&A so the design updates live as the editor changes width / colors /
 *     labels — exactly like the non-async blocks.
 *
 * No hooks and no server-only imports, so it renders in either tree. Content
 * width is a simple % or px value (width_value / width_unit), centered.
 */

/** The minimal shape this view needs (decoupled from the DB row type). */
export type FaqViewItem = { id: string; question: string; answer: string };

/** The block's historical content cap, used when the editor hasn't set a
 *  Max Content value. */
const FAQ_DEFAULT_MAX_CONTENT_PX = 820;

export default function FaqBlockView({
  content,
  featured,
  more,
  isSample,
}: {
  content: FaqContent | undefined;
  featured: FaqViewItem[];
  more: FaqViewItem[];
  isSample?: boolean;
}) {
  const c = content ?? {};
  const heading = c.heading ?? "Frequently Asked Questions";
  const subheading = c.subheading ?? "";
  const moreLabel = c.more_label ?? "More questions";
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;

  // Optional decorative frame: same image at the top and mirrored (flipped
  // vertically) at the bottom, sized as a % of the section width or px.
  const frameUrl = c.frame_image_url || undefined;
  const frameValue = c.frame_scale_value ?? 100;
  const frameWidthCss =
    (c.frame_scale_unit ?? "pct") === "px" ? `${frameValue}px` : `${frameValue}%`;

  // Section content width: % of the section, or absolute px. Centered.
  const widthValue = c.width_value ?? FAQ_DEFAULT_MAX_CONTENT_PX;
  const widthCss =
    (c.width_unit ?? "px") === "pct" ? `${widthValue}%` : `${widthValue}px`;

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: bg,
        color: textColor,
        paddingTop: padY,
        paddingBottom: padY,
      }}
    >
      {frameUrl && <FaqFrame url={frameUrl} widthCss={frameWidthCss} />}
      <div className="mx-auto px-6" style={{ maxWidth: widthCss }}>
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

        {/* .faq-speakable wraps the WHOLE FAQ list so the block's schema marks
            every answer (featured + the rest) for voice / AI read-aloud. */}
        <div className="faq-speakable">
          {/* Featured: always open. */}
          {featured.map((f) => (
            <FaqItem key={f.id} faq={f} defaultOpen />
          ))}

          {/* The rest: tucked in a collapsible panel, still in the page source
              so machines read them. */}
          {more.length > 0 && (
            <details className="mt-4 border-t border-anamaya-charcoal/10 pt-4">
              <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.15em] opacity-70 hover:opacity-100">
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
      </div>
      {frameUrl && <FaqFrame url={frameUrl} widthCss={frameWidthCss} flip />}
    </section>
  );
}

/** Decorative frame image: normal at the top, flipped vertically at the
 *  bottom. Purely decorative, so it's hidden from assistive tech. */
function FaqFrame({
  url,
  widthCss,
  flip,
}: {
  url: string;
  widthCss: string;
  flip?: boolean;
}) {
  return (
    <div className={`w-full text-center ${flip ? "mt-6" : "mb-6"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        aria-hidden
        className="inline-block h-auto max-w-full align-middle"
        style={{ width: widthCss, transform: flip ? "scaleY(-1)" : undefined }}
      />
    </div>
  );
}

/** A single question/answer as a native accordion row. */
function FaqItem({ faq, defaultOpen }: { faq: FaqViewItem; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="border-b border-anamaya-charcoal/10 py-3">
      <summary className="cursor-pointer list-none text-lg font-medium leading-snug marker:hidden">
        {faq.question}
      </summary>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed opacity-80">
        {faq.answer}
      </p>
    </details>
  );
}

/** Sample Q&A for the block-editor design preview only (never public). */
export const SAMPLE_FEATURED: FaqViewItem[] = [
  {
    id: "sample-1",
    question: "Where is Anamaya located?",
    answer:
      "Anamaya sits on a clifftop above Montezuma, on Costa Rica's Nicoya Peninsula, overlooking the Pacific.",
  },
  {
    id: "sample-2",
    question: "What's included in a stay?",
    answer:
      "Your accommodation, daily gourmet meals, yoga classes, and access to the pool, spa, and grounds are all included.",
  },
  {
    id: "sample-3",
    question: "How do I get there from the airport?",
    answer:
      "Most guests fly into San José or Liberia, then reach Montezuma by a short domestic flight, shuttle, or the ferry across the Gulf of Nicoya.",
  },
];

export const SAMPLE_MORE: FaqViewItem[] = [
  {
    id: "sample-4",
    question: "Do you offer yoga teacher training?",
    answer:
      "Yes. Anamaya runs 200-hour Yoga Teacher Trainings several times a year, led by experienced guest teachers.",
  },
  {
    id: "sample-5",
    question: "Is Anamaya a good fit for solo travelers?",
    answer:
      "Very much so. Many guests arrive on their own and connect quickly over shared meals and daily classes.",
  },
];
