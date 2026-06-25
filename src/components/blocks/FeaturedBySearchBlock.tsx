import type { FeaturedBySearchContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { RetreatCard, clamp } from "./RetreatCard";
import { recommendRetreats, buildPageContext } from "@/lib/ai/retreat-recommender";

/**
 * Featured by Search block — async server component. Instead of curating
 * retreats by hand, it uses our AI to recommend the retreats most
 * relevant to a context, ranked by *meaning* (semantic similarity), not
 * keywords. Two context modes (set in the editor):
 *
 *   - Use page content (use_page_context = true): the AI reads the
 *     current page/post and recommends retreats that fit what it's about.
 *   - Search terms (use_page_context = false): the builder types a phrase
 *     (e.g. "breathwork and nervous-system reset") and the AI recommends
 *     retreats matching that.
 *
 * Same card design as Featured Retreats. Best-effort: empty state instead
 * of a crash if AI/AO is unavailable or there's no context to work from.
 */
export default async function FeaturedBySearchBlock({
  content,
  pageId,
}: {
  content: FeaturedBySearchContent;
  pageId?: string;
}) {
  const c = content ?? {};
  const heading = c.heading ?? "Recommended Retreats";
  const subheading = c.subheading ?? "";
  const numberToShow = Math.max(1, Math.min(50, c.max_count ?? 4));
  const registerLabel = c.register_label ?? "Register Now";
  const urlPattern = c.url_pattern || "/retreats/{slug}/";
  const containerWidth = c.container_width_px ?? 1200;
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;
  const cardBg = resolveBrandColor(c.card_bg_color);
  const cardBorder = resolveBrandColor(c.card_border_color);
  const cardBorderWidth = clamp(c.card_border_width_px ?? 1, 0, 10);
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 40);

  const usePage = c.use_page_context !== false; // default to page context
  const queryText = usePage
    ? pageId
      ? await buildPageContext(pageId)
      : ""
    : (c.search_terms ?? "").trim();

  const retreats = queryText
    ? await recommendRetreats(queryText, numberToShow)
    : [];

  // Distinct empty-state copy so the builder knows *why* it's empty.
  const emptyMessage =
    usePage && !pageId
      ? "This block recommends retreats based on the page it's on — add it to a page or post (it can't read a context here in preview)."
      : usePage && !queryText
        ? "Couldn't read this page's content yet to base recommendations on."
        : !usePage && !queryText
          ? "Add a search phrase in the block editor (or switch it to use the page's content)."
          : "No matching retreats found right now.";

  return (
    <section
      className="relative w-full"
      style={{
        backgroundColor: bg,
        color: textColor,
        paddingTop: padY,
        paddingBottom: padY,
      }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <header className="mb-10 text-center">
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

        {retreats.length === 0 ? (
          <p className="rounded-md border border-dashed border-anamaya-charcoal/20 bg-white/40 p-8 text-center text-sm italic opacity-60">
            {emptyMessage}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {retreats.map((r) => (
              <RetreatCard
                key={r.id}
                r={r}
                opts={{
                  urlPattern,
                  registerLabel,
                  headingColor,
                  cardBg,
                  cardBorder,
                  cardBorderWidth,
                  cardRadius,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
