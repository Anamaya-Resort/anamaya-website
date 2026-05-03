import Link from "next/link";
import type { ThreeColumnContent, ThreeColumnSide, BlockCta } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";

/**
 * Three-column section. Self-contained — each column owns heading,
 * image, body HTML, and an optional CTA. Section-level heading +
 * background (color + optional image) wrap the row. The 7-track grid
 * uses fr units (not percentages directly) so the editor's widths
 * normalise even when they don't sum to 100.
 *
 * Mobile (default `mobile_stack: true`): single-column stack with
 * gutter / space cells hidden via display:none, leaving just the
 * three column blocks.
 */
export default function ThreeColumnBlock({ content }: { content: ThreeColumnContent }) {
  const c = content ?? {};
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const padY = c.padding_y_px ?? 64;

  const stack = c.mobile_stack !== false;
  const valign = c.vertical_align ?? "top";
  const alignItems =
    valign === "center" ? "center" : valign === "bottom" ? "end" : "start";
  // Single shared corner radius for all column images.
  const imageRadius = clamp(c.image_corner_radius_px ?? 8, 0, 40);

  // 7 track widths. Use fr units so any non-100 sum scales proportionally.
  const lg = clamp(c.left_gutter_pct ?? 5, 0, 100);
  const lc = clamp(c.left_col_pct ?? 28, 0, 100);
  const ls = clamp(c.left_space_pct ?? 3, 0, 100);
  const mc = clamp(c.middle_col_pct ?? 28, 0, 100);
  const rs = clamp(c.right_space_pct ?? 3, 0, 100);
  const rc = clamp(c.right_col_pct ?? 28, 0, 100);
  const rg = clamp(c.right_gutter_pct ?? 5, 0, 100);
  const cols = `${lg}fr ${lc}fr ${ls}fr ${mc}fr ${rs}fr ${rc}fr ${rg}fr`;

  // Background image — supports cover/contain/tile + scale, mirroring
  // RichBgBlock so behaviour is consistent across blocks.
  const fit = c.bg_image_fit ?? "cover";
  const bgImage = c.bg_image_url ? `url(${c.bg_image_url})` : undefined;
  const scalePct = clamp(c.bg_image_scale_pct ?? 100, 50, 200);
  const bgSize =
    fit === "tile"
      ? `${scalePct}%`
      : scalePct === 100
      ? fit
      : `${scalePct}% auto`;
  const bgRepeat = fit === "tile" ? "repeat" : "no-repeat";

  const headingAlign =
    c.heading_align === "left"
      ? "text-left"
      : c.heading_align === "right"
      ? "text-right"
      : "text-center";

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: bg,
        backgroundImage: bgImage,
        backgroundSize: bgSize,
        backgroundPosition: "center",
        backgroundRepeat: bgRepeat,
        color: textColor,
        paddingTop: padY,
        paddingBottom: padY,
      }}
    >
      {c.heading && (
        <h2
          className={`mb-10 px-6 font-semibold ${headingAlign} ${
            c.heading_font === "body" ? "font-sans" : "font-heading"
          }`}
          style={{
            fontSize: c.heading_size_px ?? 36,
            color: resolveBrandColor(c.heading_color) ?? undefined,
            fontWeight: c.heading_bold ? 700 : 600,
            fontStyle: c.heading_italic ? "italic" : "normal",
          }}
        >
          {c.heading}
        </h2>
      )}

      <div
        className={`grid ${stack ? "grid-cols-1 md:grid-cols-[var(--cols)]" : ""}`}
        style={
          {
            ["--cols" as string]: cols,
            gridTemplateColumns: stack ? undefined : cols,
            alignItems,
          } as React.CSSProperties
        }
      >
        <Spacer stack={stack} /> {/* left gutter */}
        <ColumnView side={c.left} stack={stack} imageRadius={imageRadius} />
        <Spacer stack={stack} /> {/* left space */}
        <ColumnView side={c.middle} stack={stack} imageRadius={imageRadius} />
        <Spacer stack={stack} /> {/* right space */}
        <ColumnView side={c.right} stack={stack} imageRadius={imageRadius} />
        <Spacer stack={stack} /> {/* right gutter */}
      </div>
    </section>
  );
}

function Spacer({ stack }: { stack: boolean }) {
  // On mobile (stack=true) we hide the gutters and inter-column spaces
  // so the three columns stack flush. On desktop they're visible (and
  // empty) so they consume the editor-defined width.
  return <div className={stack ? "hidden md:block" : ""} aria-hidden />;
}

function ColumnView({
  side,
  stack,
  imageRadius,
}: {
  side: ThreeColumnSide | undefined;
  stack: boolean;
  imageRadius: number;
}) {
  const s = side ?? {};
  const url = s.url ?? "";
  // The CTA's own href wins; if empty, fall back to the column URL so
  // editors who only fill in `url` get the CTA pointing at the same
  // place as the image and heading.
  const cta: BlockCta = s.cta ?? {};
  const resolvedCta: BlockCta = {
    ...cta,
    cta_href: cta.cta_href || url || undefined,
  };

  const headingNode = s.heading ? (
    <h3
      className={s.heading_font === "body" ? "font-sans" : "font-heading"}
      style={{
        fontSize: s.heading_size_px ?? 22,
        color: resolveBrandColor(s.heading_color) ?? undefined,
        fontWeight: s.heading_bold ? 700 : 600,
        fontStyle: s.heading_italic ? "italic" : "normal",
        marginTop: 12,
      }}
    >
      {url ? (
        <Link href={url} className="hover:opacity-80">
          {s.heading}
        </Link>
      ) : (
        s.heading
      )}
    </h3>
  ) : null;

  const imageNode = s.image_url ? (
    url ? (
      <Link href={url} className="block overflow-hidden" style={{ borderRadius: imageRadius }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.image_url}
          alt={s.image_alt ?? ""}
          className="block w-full transition-opacity hover:opacity-95"
        />
      </Link>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.image_url}
        alt={s.image_alt ?? ""}
        className="block w-full"
        style={{ borderRadius: imageRadius }}
      />
    )
  ) : null;

  return (
    <div className={`min-w-0 ${stack ? "px-6 mb-8 md:mb-0 md:px-0" : ""}`}>
      {imageNode}
      {headingNode}
      {s.body_html && (
        <div
          className={`prose-anamaya prose-anamaya-block ${
            s.body_font === "heading" ? "font-heading" : "font-sans"
          }`}
          style={{
            fontSize: s.body_size_px ?? undefined,
            color: resolveBrandColor(s.body_color) ?? undefined,
            marginTop: 12,
          }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: s.body_html }}
        />
      )}
      {resolvedCta.cta_enabled && <CtaButton cta={resolvedCta} />}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
