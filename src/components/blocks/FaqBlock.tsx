import type { FaqContent } from "@/types/blocks";
import { getPublicFaqs } from "@/lib/website-builder/faqs";
import FaqBlockView, {
  SAMPLE_FEATURED,
  SAMPLE_MORE,
  type FaqViewItem,
} from "./FaqBlockView";

/**
 * FAQ block — async server component. The questions/answers are specific to
 * the page it renders on (looked up from page_faqs by pageId), so one block on
 * a template yields a different FAQ set per page/post.
 *
 * Machine-visibility is the whole point of this block, so:
 *   - It renders on the SERVER: every Q&A is in the HTML the crawler receives.
 *   - Non-featured answers sit in a native <details> panel (see FaqBlockView) —
 *     hidden until clicked, but present in the page source for Google/LLMs.
 *   - It emits FAQPage JSON-LD (all Q&A) so machines parse the pairs cleanly.
 *
 * Only APPROVED pages render (getPublicFaqs gates on it), so a crawler never
 * hits an ungenerated/unreviewed page. The visual markup lives in FaqBlockView
 * so the block editor can render the same design inline (with sample content).
 */
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

  // Admin preview surface: sample content, no JSON-LD (can't be mistaken for
  // real structured data, and never reaches a public page).
  if (preview) {
    return <FaqBlockView content={c} featured={SAMPLE_FEATURED} more={SAMPLE_MORE} isSample />;
  }

  // No page context on a public render path: render nothing. A hint box must
  // never reach a crawlable page (e.g. /home2, /preview/template).
  if (!pageId) return null;

  const { featured, more } = await getPublicFaqs(pageId);
  // Nothing approved for this page yet: render nothing on the public site.
  if (featured.length === 0 && more.length === 0) return null;

  const toView = (f: { id: string; question: string; answer: string }): FaqViewItem => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
  });
  const featuredView = featured.map(toView);
  const moreView = more.map(toView);

  const all = [...featuredView, ...moreView];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
    // Tell voice / AI assistants which text is best read aloud. The
    // `.faq-speakable` selector wraps ALL the answers in FaqBlockView, so every
    // Q&A is a read-aloud candidate (per current best practice), not just the
    // featured ones.
    ...(all.length > 0
      ? {
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".faq-speakable"],
          },
        }
      : {}),
  };
  // Escape the JSON so a question/answer containing "</script>" (or "<", "&")
  // can't break out of the <script type="application/ld+json"> element. These
  // are valid JSON string escapes, so parsers are unaffected.
  const jsonLdHtml = JSON.stringify(jsonLd)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <>
      {/* Structured data — an unambiguous Q&A signal for Google/LLMs. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <FaqBlockView content={c} featured={featuredView} more={moreView} />
    </>
  );
}
