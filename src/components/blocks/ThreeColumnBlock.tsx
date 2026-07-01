import Link from "next/link";
import type { ThreeColumnContent, ThreeColumnSide, BlockCta } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { fluidHeading, fluidBody, fluidSpace } from "@/lib/responsive";
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

  const valign = c.vertical_align ?? "top";
  const alignItems =
    valign === "center" ? "center" : valign === "bottom" ? "end" : "start";
  // Single shared corner radius for all column images.
  const imageRadius = clamp(c.image_corner_radius_px ?? 8, 0, 40);

  // 7 track widths per device, in fr units so any non-100 sum scales
  // proportionally. Phones (<768px) always stack to one column; tablet
  // (768–1023px) and desktop (≥1024px) each get their own widths, with
  // tablet falling back to the desktop value when it isn't set.
  const dLg = clamp(c.left_gutter_pct ?? 5, 0, 100);
  const dLc = clamp(c.left_col_pct ?? 28, 0, 100);
  const dLs = clamp(c.left_space_pct ?? 3, 0, 100);
  const dMc = clamp(c.middle_col_pct ?? 28, 0, 100);
  const dRs = clamp(c.right_space_pct ?? 3, 0, 100);
  const dRc = clamp(c.right_col_pct ?? 28, 0, 100);
  const dRg = clamp(c.right_gutter_pct ?? 5, 0, 100);
  const colsDesktop = `${dLg}fr ${dLc}fr ${dLs}fr ${dMc}fr ${dRs}fr ${dRc}fr ${dRg}fr`;

  const tLg = clamp(c.left_gutter_pct_tablet ?? dLg, 0, 100);
  const tLc = clamp(c.left_col_pct_tablet ?? dLc, 0, 100);
  const tLs = clamp(c.left_space_pct_tablet ?? dLs, 0, 100);
  const tMc = clamp(c.middle_col_pct_tablet ?? dMc, 0, 100);
  const tRs = clamp(c.right_space_pct_tablet ?? dRs, 0, 100);
  const tRc = clamp(c.right_col_pct_tablet ?? dRc, 0, 100);
  const tRg = clamp(c.right_gutter_pct_tablet ?? dRg, 0, 100);
  const colsTablet = `${tLg}fr ${tLc}fr ${tLs}fr ${tMc}fr ${tRs}fr ${tRc}fr ${tRg}fr`;

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
        paddingTop: fluidSpace(padY),
        paddingBottom: fluidSpace(padY),
      }}
    >
      {c.heading && (
        <h2
          className={`mb-10 px-6 font-semibold ${headingAlign} ${
            c.heading_font === "body" ? "font-sans" : "font-heading"
          }`}
          style={{
            fontSize: fluidHeading(c.heading_size_px ?? 36),
            color: resolveBrandColor(c.heading_color) ?? undefined,
            fontWeight: c.heading_bold ? 700 : 600,
            fontStyle: c.heading_italic ? "italic" : "normal",
          }}
        >
          {c.heading}
        </h2>
      )}

      <div
        className="grid grid-cols-1 md:grid-cols-[var(--cols-t)] lg:grid-cols-[var(--cols-d)]"
        style={
          {
            ["--cols-t" as string]: colsTablet,
            ["--cols-d" as string]: colsDesktop,
            alignItems,
          } as React.CSSProperties
        }
      >
        <Spacer /> {/* left gutter */}
        <ColumnView side={c.left} imageRadius={imageRadius} />
        <Spacer /> {/* left space */}
        <ColumnView side={c.middle} imageRadius={imageRadius} />
        <Spacer /> {/* right space */}
        <ColumnView side={c.right} imageRadius={imageRadius} />
        <Spacer /> {/* right gutter */}
      </div>
    </section>
  );
}

function Spacer() {
  // Hidden on phones (columns stack flush); shown at tablet+ so the
  // gutters and inter-column spaces consume the editor-defined width.
  return <div className="hidden md:block" aria-hidden />;
}

function ColumnView({
  side,
  imageRadius,
}: {
  side: ThreeColumnSide | undefined;
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
        fontSize: fluidHeading(s.heading_size_px ?? 22),
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
    <div className="min-w-0 px-6 mb-8 md:mb-0 md:px-0">
      {imageNode}
      {headingNode}
      {s.body_html && (
        <div
          className={`prose-anamaya prose-anamaya-block ${
            s.body_font === "heading" ? "font-heading" : "font-sans"
          }`}
          style={{
            fontSize: s.body_size_px ? fluidBody(s.body_size_px) : undefined,
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
