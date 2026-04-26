import type { PersonCardContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import ProseHtml from "@/components/ProseHtml";
import CtaButton from "./shared/CtaButton";

/**
 * Person card — used for retreat-leader, teacher, and guest-speaker bios.
 * Two layouts: side-by-side (photo left, text right) or stacked (centered
 * photo above text). The block is intentionally generic: a "retreat-leader"
 * page section is just a person_card with the retreat-leader's photo + bio
 * piped in by the page composer.
 */
export default function PersonCardBlock({ content }: { content: PersonCardContent }) {
  if (!content?.name) return null;

  const layout = content?.layout ?? "side-by-side";
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color);
  const pad = content?.padding_y_px ?? 64;
  const photoPct = clamp(content?.photo_width_pct ?? 30, 20, 50);

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <div className="mx-auto w-full max-w-[1100px] px-6">
        {layout === "stacked" ? (
          <div className="flex flex-col items-center text-center">
            {content.photo_url && (
              <img
                src={content.photo_url}
                alt={content.photo_alt ?? content.name}
                className="mb-6 h-48 w-48 rounded-full object-cover"
              />
            )}
            <Heading content={content} />
            {content.html && (
              <div className="mt-4 max-w-2xl">
                <ProseHtml html={content.html} />
              </div>
            )}
            <PersonLink content={content} />
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            {content.photo_url && (
              <div className="flex-shrink-0" style={{ width: `${photoPct}%` }}>
                <img
                  src={content.photo_url}
                  alt={content.photo_alt ?? content.name}
                  className="w-full rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <Heading content={content} />
              {content.html && (
                <div className="mt-4">
                  <ProseHtml html={content.html} />
                </div>
              )}
              <PersonLink content={content} />
            </div>
          </div>
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function Heading({ content }: { content: PersonCardContent }) {
  return (
    <>
      <h2 className="font-heading text-3xl">{content.name}</h2>
      {content.credentials && (
        <p className="mt-1 text-sm font-semibold uppercase tracking-wider opacity-70">
          {content.credentials}
        </p>
      )}
    </>
  );
}

function PersonLink({ content }: { content: PersonCardContent }) {
  if (!content.link_href || !content.link_label) return null;
  return (
    <a
      href={content.link_href}
      className="mt-4 inline-block font-semibold text-anamaya-green hover:underline"
    >
      {content.link_label} →
    </a>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
