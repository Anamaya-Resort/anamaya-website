import Link from "next/link";
import type { UiFooterMainContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
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
 * Block-typed port of the legacy Footer.tsx dark section. Renders a
 * grid of link columns + an optional social-icons cluster + an embedded
 * newsletter form. Every label, link, color, and form id is editable
 * via the block editor. Sits in normal document flow at the bottom of
 * every page (rendered by AppShell from the `site_footer` template).
 */
export default function UiFooterMainBlock({ content }: { content: UiFooterMainContent }) {
  const c = content ?? {};
  const bgRaw = resolveBrandColor(c.bg_color) ?? DEFAULT_BG_HEX;
  const bgOpacity = (c.bg_opacity ?? 100) / 100;
  const bg = applyAlpha(bgRaw, bgOpacity);
  const headingColor = resolveBrandColor(c.heading_color) ?? DEFAULT_HEADING;
  const linkColor = resolveBrandColor(c.link_color) ?? DEFAULT_LINK;
  const textColor = resolveBrandColor(c.text_color) ?? DEFAULT_TEXT;

  const columns = c.columns ?? [];
  const socialLinks = c.social_links ?? [];
  const socialHeading = c.social_heading ?? "";
  const newsletterFormId = c.newsletter_form_id ?? "";
  const newsletterHeading = c.newsletter_heading ?? "";

  const totalCols = Math.max(
    1,
    columns.length + (socialLinks.length > 0 ? 1 : 0) + (newsletterFormId ? 1 : 0),
  );
  const gridCols =
    totalCols >= 4 ? "lg:grid-cols-4"
    : totalCols === 3 ? "lg:grid-cols-3"
    : totalCols === 2 ? "lg:grid-cols-2"
    : "lg:grid-cols-1";

  return (
    <footer style={{ backgroundColor: bg, color: textColor }}>
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-6 lg:px-8">
        <div className={`grid grid-cols-1 gap-10 sm:grid-cols-2 ${gridCols}`}>
          {columns.map((col, i) => (
            <FooterColumnView
              key={`${col.heading}-${i}`}
              heading={col.heading}
              headingColor={headingColor}
              linkColor={linkColor}
            >
              <ul className="space-y-1.5 text-sm">
                {col.items.map((item, j) => (
                  <li key={`${item.label}-${j}`}>
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
            </FooterColumnView>
          ))}

          {socialLinks.length > 0 && (
            <FooterColumnView
              heading={socialHeading || "On social"}
              headingColor={headingColor}
              linkColor={linkColor}
            >
              <ul className="flex flex-wrap gap-2">
                {socialLinks.map((s) => {
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
            </FooterColumnView>
          )}

          {newsletterFormId && (
            <FooterColumnView
              heading={newsletterHeading || "Receive our newsletter"}
              headingColor={headingColor}
              linkColor={linkColor}
            >
              <div className="rounded-sm bg-white">
                <SereenlyForm
                  formId={newsletterFormId}
                  title={c.newsletter_form_name ?? "Newsletter Footer"}
                  formName={c.newsletter_form_name ?? "Newsletter Footer"}
                  initialHeight={c.newsletter_form_height ?? 380}
                />
              </div>
            </FooterColumnView>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterColumnView({
  heading,
  headingColor,
  children,
}: {
  heading: string;
  headingColor: string;
  linkColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 last:mb-0">
      <h3
        className="text-base font-semibold tracking-wide"
        style={{ color: headingColor }}
      >
        {heading}
      </h3>
      <div className="mt-2 mb-4 h-px w-full bg-white/15" />
      {children}
    </div>
  );
}
