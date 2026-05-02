import type {
  FooterColumn,
  FooterColumnGroup,
  FooterLinkItem,
  UiFooterMainContent,
} from "@/types/blocks";

/**
 * Coerce a footer-main block's content to the current shape no matter
 * which version of the schema it was saved under. Used by both the
 * renderer and the editor's normalize so a stale row never crashes the
 * page.
 *
 * Two shapes are accepted:
 *   - New: { columns: [{ groups: [...] }] }  — nested groups per column
 *   - Old: { columns: [{ heading, items }],
 *            social_heading, social_links, newsletter_* }
 *
 * Old shape is mapped 1:1 — each flat column becomes a 1-group column,
 * social and newsletter become their own appended columns. Any unknown
 * input degrades to an empty columns array rather than throwing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function coerceFooterMainContent(raw: any): UiFooterMainContent {
  const c = raw ?? {};

  const newColumns = Array.isArray(c.columns)
    ? c.columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((col: any): FooterColumn | null => {
          if (col && Array.isArray(col.groups)) {
            // Already new shape — pass through (filter out malformed groups).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const groups: FooterColumnGroup[] = col.groups.filter((g: any) =>
              g && (g.kind === "links" || g.kind === "social" || g.kind === "newsletter"),
            );
            return { groups };
          }
          if (col && typeof col.heading === "string" && Array.isArray(col.items)) {
            // Old flat shape: {heading, items} → wrap as a single links group.
            const items: FooterLinkItem[] = col.items
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((i: any) => i && typeof i.label === "string")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((i: any) => ({ label: i.label, href: i.href ?? "" }));
            return {
              groups: [{ kind: "links", heading: col.heading, items }],
            };
          }
          return null;
        })
        .filter((col: FooterColumn | null): col is FooterColumn => col !== null)
    : [];

  // Old top-level social_* + newsletter_* — if present, append as their
  // own columns so the data survives the migration to the new shape.
  if (Array.isArray(c.social_links) && c.social_links.length > 0) {
    newColumns.push({
      groups: [
        {
          kind: "social",
          heading: typeof c.social_heading === "string" ? c.social_heading : "On social",
          links: c.social_links
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((l: any) => l && typeof l.label === "string")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((l: any) => ({ label: l.label, href: l.href ?? "" })),
        },
      ],
    });
  }
  if (typeof c.newsletter_form_id === "string" && c.newsletter_form_id) {
    newColumns.push({
      groups: [
        {
          kind: "newsletter",
          heading:
            typeof c.newsletter_heading === "string"
              ? c.newsletter_heading
              : "Receive our newsletter",
          form_id: c.newsletter_form_id,
          form_name: c.newsletter_form_name,
          form_height: c.newsletter_form_height,
        },
      ],
    });
  }

  return {
    bg_color: typeof c.bg_color === "string" ? c.bg_color : "",
    bg_opacity: typeof c.bg_opacity === "number" ? c.bg_opacity : 100,
    heading_color: typeof c.heading_color === "string" ? c.heading_color : "",
    link_color: typeof c.link_color === "string" ? c.link_color : "",
    text_color: typeof c.text_color === "string" ? c.text_color : "",
    columns: newColumns,
  };
}
