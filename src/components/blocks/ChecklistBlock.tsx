import type { ChecklistContent, ChecklistItem } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";
import DecorationOverlay from "./shared/DecorationOverlay";

/** Two rows of checklist items on a branded background. */
export default function ChecklistBlock({ content }: { content: ChecklistContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const textSize = content?.text_size_px ?? 16;
  const headingColor = resolveBrandColor(content?.heading_color) ?? color;
  const headingFontClass = content?.heading_font === "body" ? "font-sans" : "font-heading";
  const top = content?.columns_top ?? [];
  const bottom = content?.columns_bottom ?? [];
  const contentWidth = content?.content_width_px ?? 1200;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <DecorationOverlay frame={content} />
      <div className="relative mx-auto w-full px-6" style={{ maxWidth: contentWidth }}>
        {content?.heading && (
          <h2
            className={`${headingFontClass} mb-6 text-center`}
            style={{
              fontSize: content?.heading_size_px ?? 28,
              color: headingColor,
            }}
          >
            {content.heading}
          </h2>
        )}

        <Row items={top} textSize={textSize} />
        {bottom.length > 0 && (
          <div className="mt-3">
            <Row items={bottom} textSize={textSize} />
          </div>
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function Row({ items, textSize }: { items: ChecklistItem[]; textSize: number }) {
  if (items.length === 0) return null;
  return (
    <ul
      className="grid gap-x-6 gap-y-2"
      style={{
        gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
        fontSize: textSize,
      }}
    >
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <Check />
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 flex-shrink-0 text-anamaya-green"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
