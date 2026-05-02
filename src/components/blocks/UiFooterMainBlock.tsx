import Link from "next/link";
import type { FooterColumnGroup, UiFooterMainContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { coerceFooterMainContent } from "@/lib/footer-content";
import { SOCIAL_ICON_MAP } from "../SocialIcons";
import SereenlyForm from "../SereenlyForm";

const DEFAULT_BG_HEX = "#444444";       // anamaya-charcoal
const DEFAULT_HEADING = "#8F993E";      // anamaya-olive
const DEFAULT_LINK = "#b8d3cf";         // anamaya-mint
const DEFAULT_TEXT = "#b8d3cf";

function applyAlpha(color: string, alpha: number): string {
  let hex = color.trim();
  if (!hex.startsWith("#")) return color;
  hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Block-typed port of the legacy Footer.tsx dark section. Renders the
 * editor-defined columns left-to-right, with each column's groups
 * stacked vertically inside it. Group kinds: "links" (heading + list),
 * "social" (heading + icon row), "newsletter" (heading + Sereenly
 * form). Stacking matches the legacy v2 layout exactly:
 *   Col 1: Experience
 *   Col 2: Travel + Cookbook
 *   Col 3: Company + Social
 *   Col 4: Newsletter
 */
export default function UiFooterMainBlock({ content }: { content: UiFooterMainContent }) {
  // Coerce so legacy shape (flat columns + social_* + newsletter_*)
  // doesn't crash this renderer before 0031 has been applied.
  const c = coerceFooterMainContent(content);
  const bgRaw = resolveBrandColor(c.bg_color) ?? DEFAULT_BG_HEX;
  const bgOpacity = (c.bg_opacity ?? 100) / 100;
  const bg = applyAlpha(bgRaw, bgOpacity);
  const headingColor = resolveBrandColor(c.heading_color) ?? DEFAULT_HEADING;
  const linkColor = resolveBrandColor(c.link_color) ?? DEFAULT_LINK;
  const textColor = resolveBrandColor(c.text_color) ?? DEFAULT_TEXT;

  const columns = c.columns ?? [];
  const colCount = Math.min(4, Math.max(1, columns.length || 1));
  const lgGridCols =
    colCount === 4 ? "lg:grid-cols-4"
    : colCount === 3 ? "lg:grid-cols-3"
    : colCount === 2 ? "lg:grid-cols-2"
    : "lg:grid-cols-1";

  return (
    <footer style={{ backgroundColor: bg, color: textColor }}>
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-6 lg:px-8">
        <div className={`grid grid-cols-1 gap-10 sm:grid-cols-2 ${lgGridCols}`}>
          {columns.map((col, i) => (
            <div key={i}>
              {(col.groups ?? []).map((g, j) => (
                <FooterGroupView
                  key={j}
                  group={g}
                  headingColor={headingColor}
                  linkColor={linkColor}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

function FooterGroupView({
  group,
  headingColor,
  linkColor,
}: {
  group: FooterColumnGroup;
  headingColor: string;
  linkColor: string;
}) {
  if (group.kind === "links") {
    return (
      <Section heading={group.heading} headingColor={headingColor}>
        <ul className="space-y-1.5 text-sm">
          {group.items.map((item, i) => (
            <li key={`${item.label}-${i}`}>
              <Link
                href={item.href || "#"}
                style={{ color: linkColor }}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    );
  }
  if (group.kind === "social") {
    return (
      <Section heading={group.heading} headingColor={headingColor}>
        <ul className="flex flex-wrap gap-2">
          {group.links.map((s) => {
            const Icon = SOCIAL_ICON_MAP[s.label];
            return (
              <li key={s.label}>
                <Link
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: linkColor }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white hover:text-anamaya-charcoal"
                >
                  {Icon ? <Icon className="h-4 w-4" /> : s.label.slice(0, 2)}
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    );
  }
  if (group.kind === "newsletter") {
    if (!group.form_id) return null;
    return (
      <Section heading={group.heading} headingColor={headingColor}>
        <div className="rounded-sm bg-white">
          <SereenlyForm
            formId={group.form_id}
            title={group.form_name ?? "Newsletter Footer"}
            formName={group.form_name ?? "Newsletter Footer"}
            initialHeight={group.form_height ?? 380}
          />
        </div>
      </Section>
    );
  }
  return null;
}

function Section({
  heading,
  headingColor,
  children,
}: {
  heading: string;
  headingColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 last:mb-0">
      {heading && (
        <h3
          className="text-base font-semibold tracking-wide"
          style={{ color: headingColor }}
        >
          {heading}
        </h3>
      )}
      {heading && <div className="mt-2 mb-4 h-px w-full bg-white/15" />}
      {children}
    </div>
  );
}
