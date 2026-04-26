import type { FeatureListContent, FeatureListItem } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";
import DecorationOverlay from "./shared/DecorationOverlay";

/**
 * Feature / inclusions list. Three layouts:
 *   - "stack": vertical list, full-width rows (good for long descriptions)
 *   - "grid":  responsive grid with optional icon/image (good for "what's included")
 *   - "split": image alternates left/right per item (good for "workshops")
 */
export default function FeatureListBlock({ content }: { content: FeatureListContent }) {
  const items = content?.items ?? [];
  if (items.length === 0) return null;

  const layout = content?.layout ?? "grid";
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color);
  const pad = content?.padding_y_px ?? 64;
  const contentWidth = content?.content_width_px ?? 1200;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <DecorationOverlay frame={content} />
      <div className="relative mx-auto w-full px-6" style={{ maxWidth: contentWidth }}>
        {content?.heading && (
          <h2 className="mb-3 text-center font-heading text-3xl">{content.heading}</h2>
        )}
        {content?.intro && (
          <p className="mx-auto mb-10 max-w-2xl text-center text-base opacity-80">
            {content.intro}
          </p>
        )}

        {layout === "stack" && <StackLayout items={items} />}
        {layout === "grid" && <GridLayout items={items} columns={content?.columns ?? 3} />}
        {layout === "split" && <SplitLayout items={items} />}

        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function StackLayout({ items }: { items: FeatureListItem[] }) {
  return (
    <ul className="space-y-6">
      {items.map((it, i) => (
        <li key={i} className="flex gap-4">
          <Icon kind={it.icon} />
          <div className="flex-1">
            <ItemHeader item={it} />
            {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function GridLayout({ items, columns }: { items: FeatureListItem[]; columns: number }) {
  return (
    <ul
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((it, i) => (
        <li key={i} className="rounded-lg border border-anamaya-mint bg-white/40 p-5">
          {it.image_url ? (
            <img
              src={it.image_url}
              alt={it.image_alt ?? it.title}
              className="mb-4 h-40 w-full rounded object-cover"
            />
          ) : (
            <Icon kind={it.icon} />
          )}
          <ItemHeader item={it} />
          {it.description && <p className="mt-2 text-sm opacity-80">{it.description}</p>}
        </li>
      ))}
    </ul>
  );
}

function SplitLayout({ items }: { items: FeatureListItem[] }) {
  return (
    <ul className="space-y-12">
      {items.map((it, i) => {
        const reverse = i % 2 === 1;
        return (
          <li
            key={i}
            className={`flex flex-col items-center gap-6 md:flex-row ${
              reverse ? "md:flex-row-reverse" : ""
            }`}
          >
            {it.image_url && (
              <div className="md:w-1/2">
                <img
                  src={it.image_url}
                  alt={it.image_alt ?? it.title}
                  className="w-full rounded-lg object-cover"
                />
              </div>
            )}
            <div className={it.image_url ? "md:w-1/2" : "w-full"}>
              <ItemHeader item={it} large />
              {it.description && <p className="mt-3 text-base opacity-90">{it.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ItemHeader({ item, large }: { item: FeatureListItem; large?: boolean }) {
  const titleClass = large ? "font-heading text-2xl" : "font-heading text-lg";
  const titleNode = (
    <h3 className="flex flex-wrap items-baseline gap-2">
      <span className={titleClass}>{item.title}</span>
      {item.price && <span className="text-sm font-semibold opacity-70">{item.price}</span>}
    </h3>
  );
  if (item.href) {
    return (
      <a href={item.href} className="hover:underline">
        {titleNode}
      </a>
    );
  }
  return titleNode;
}

function Icon({ kind }: { kind?: FeatureListItem["icon"] }) {
  const k = kind ?? "dot";
  const paths: Record<NonNullable<FeatureListItem["icon"]>, string> = {
    check:   "M20 6 9 17l-5-5",
    star:    "M12 2l3 7 7 .8-5.3 4.7L18.2 22 12 18l-6.2 4 1.5-7.5L2 9.8 9 9z",
    heart:   "M12 21s-8-5.5-8-11a5 5 0 019-3 5 5 0 019 3c0 5.5-8 11-8 11z",
    leaf:    "M3 21c4-12 12-15 18-15-1 9-7 16-15 16-1 0-2-1-3-1z",
    sparkle: "M12 2v6m0 8v6m-10-10h6m8 0h6",
    dot:     "M12 12 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-1 flex-shrink-0 text-anamaya-green"
      aria-hidden="true"
    >
      <path d={paths[k]} />
    </svg>
  );
}
