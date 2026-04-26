import type { PricingTableContent, PricingTier } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";
import DecorationOverlay from "./shared/DecorationOverlay";

/**
 * Pricing table — N tiers in a responsive grid. `price` is a free-form
 * string so "Sold out", "From $1,234", and "Pay what you can" all work
 * without the block needing to know about currency formatting.
 */
export default function PricingTableBlock({ content }: { content: PricingTableContent }) {
  const tiers = content?.tiers ?? [];
  if (tiers.length === 0) return null;

  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color);
  const pad = content?.padding_y_px ?? 64;
  const cols = content?.columns ?? Math.min(tiers.length, 4);
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

        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {tiers.map((tier, i) => (
            <TierCard key={i} tier={tier} />
          ))}
        </div>

        {content?.footnote && (
          <p className="mt-8 text-center text-sm opacity-70">{content.footnote}</p>
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`flex flex-col items-center rounded-lg border p-6 text-center ${
        tier.highlight
          ? "border-anamaya-green bg-anamaya-green/5 shadow-md"
          : "border-anamaya-mint bg-white/40"
      }`}
    >
      <h3 className="font-heading text-xl">{tier.name}</h3>
      {tier.price && (
        <div className="mt-3 text-3xl font-semibold">
          {tier.price}
          {tier.currency && <span className="ml-1 text-sm opacity-60">{tier.currency}</span>}
        </div>
      )}
      {tier.note && <p className="mt-3 text-sm opacity-70">{tier.note}</p>}
    </div>
  );
}
