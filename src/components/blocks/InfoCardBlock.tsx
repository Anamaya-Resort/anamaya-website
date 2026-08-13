import type { InfoCardContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Info Card — the first VERTICAL block. A compact side-column card: heading,
 * an optional highlighted value (e.g. a price), quick-fact rows, and a CTA.
 * Self-contained; the two-column template renderer handles placing it in the
 * side column and its sticky / slide-out behavior (via `responsive_mode`).
 */
export default function InfoCardBlock({ content }: { content: InfoCardContent }) {
  const c = content ?? {};
  const bg = resolveBrandColor(c.bg_color) ?? "#ffffff";
  const text = resolveBrandColor(c.text_color) ?? undefined;
  const rows = Array.isArray(c.rows) ? c.rows.filter((r) => r && (r.label || r.value)) : [];

  return (
    <aside className="w-full" style={{ color: text }}>
      <div
        className="rounded-2xl border border-anamaya-mint/50 p-6 shadow-sm"
        style={{ backgroundColor: bg }}
      >
        {c.heading && (
          <h3 className="font-heading text-xl font-semibold leading-tight text-anamaya-charcoal">
            {c.heading}
          </h3>
        )}
        {c.subheading && (
          <p className="mt-1 text-sm leading-relaxed text-anamaya-charcoal/70">{c.subheading}</p>
        )}

        {c.highlight_value && (
          <div className="mt-4">
            {c.highlight_label && (
              <div className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/50">
                {c.highlight_label}
              </div>
            )}
            <div className="font-heading text-3xl font-semibold text-anamaya-green">
              {c.highlight_value}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <dl className="mt-4 divide-y divide-anamaya-charcoal/10">
            {rows.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-sm text-anamaya-charcoal/60">{r.label}</dt>
                <dd className="text-right text-sm font-semibold text-anamaya-charcoal">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {c.cta_label && c.cta_href && (
          <a
            href={c.cta_href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-full bg-anamaya-green px-5 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            {c.cta_label}
          </a>
        )}
      </div>
    </aside>
  );
}
