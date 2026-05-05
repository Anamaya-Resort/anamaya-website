import type { ImageSlideshowContent, ImageSlideshowSlide } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import SlideshowCarousel from "./shared/SlideshowCarousel";

/**
 * Full-width image slideshow with crossfade. Server-renders every
 * slide as a stacked grid cell so SEO + LLM crawlers see all images
 * + their captions in initial HTML; a small client island toggles
 * opacity to crossfade between slides.
 *
 * Per-slide content: image_url + optional text overlay.
 * Global content: font / size / colour / alignment / position /
 * stroke (letter border) / dark-overlay / display + fade timing.
 */
export default function ImageSlideshowBlock({
  content,
}: {
  content: ImageSlideshowContent;
}) {
  const c = content ?? {};
  const slides = (c.slides ?? []).filter((s) => s.image_url);
  if (slides.length === 0) return null;

  const heightVh = clamp(c.height_vh ?? 80, 10, 100);
  const display = clamp(c.display_seconds ?? 4, 0.5, 60);
  const fade = clamp(c.fade_seconds ?? 1.5, 0, 10);
  const overlay = clamp(c.overlay_opacity ?? 0, 0, 100) / 100;
  const imageFit = c.image_fit ?? "cover";
  const bg = resolveBrandColor(c.bg_color) ?? "#000";

  // Text styling
  const textFontClass =
    c.text_font === "body" ? "font-sans" : "font-heading";
  const textSize = c.text_size_px ?? 56;
  const textColor = resolveBrandColor(c.text_color) ?? "#ffffff";
  const textAlign = c.text_align ?? "center";
  const textPosition = c.text_position ?? "center";
  const textBold = c.text_bold ?? false;
  const textItalic = c.text_italic ?? false;

  const strokeWidth = clamp(c.text_stroke_width_px ?? 0, 0, 20);
  const strokeColor = resolveBrandColor(c.text_stroke_color) ?? "#000000";

  const positionClass =
    textPosition === "top"
      ? "items-start"
      : textPosition === "bottom"
        ? "items-end"
        : "items-center";
  const alignClass =
    textAlign === "left"
      ? "justify-start text-left"
      : textAlign === "right"
        ? "justify-end text-right"
        : "justify-center text-center";

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: `${heightVh}vh`, backgroundColor: bg }}
      data-slideshow-carousel
    >
      {slides.map((slide, i) => (
        <Slide
          key={i}
          slide={slide}
          firstVisible={i === 0}
          fadeSeconds={fade}
          imageFit={imageFit}
          overlayOpacity={overlay}
          textFontClass={textFontClass}
          textSize={textSize}
          textColor={textColor}
          textBold={textBold}
          textItalic={textItalic}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          positionClass={positionClass}
          alignClass={alignClass}
        />
      ))}
      {slides.length > 1 && (
        <SlideshowCarousel
          count={slides.length}
          displaySeconds={display}
          fadeSeconds={fade}
        />
      )}
    </section>
  );
}

function Slide({
  slide,
  firstVisible,
  fadeSeconds,
  imageFit,
  overlayOpacity,
  textFontClass,
  textSize,
  textColor,
  textBold,
  textItalic,
  strokeWidth,
  strokeColor,
  positionClass,
  alignClass,
}: {
  slide: ImageSlideshowSlide;
  firstVisible: boolean;
  fadeSeconds: number;
  imageFit: "cover" | "contain";
  overlayOpacity: number;
  textFontClass: string;
  textSize: number;
  textColor: string;
  textBold: boolean;
  textItalic: boolean;
  strokeWidth: number;
  strokeColor: string;
  positionClass: string;
  alignClass: string;
}) {
  return (
    <figure
      data-slideshow-slide
      aria-hidden={firstVisible ? undefined : "true"}
      className="absolute inset-0 transition-opacity ease-in-out"
      style={{
        opacity: firstVisible ? 1 : 0,
        transitionDuration: `${fadeSeconds * 1000}ms`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image_url}
        alt={slide.image_alt ?? ""}
        loading={firstVisible ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: imageFit }}
      />
      {overlayOpacity > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      {slide.text && (
        <figcaption
          className={`absolute inset-0 flex p-6 sm:p-12 ${positionClass} ${alignClass}`}
        >
          <span
            className={`${textFontClass} max-w-5xl leading-tight`}
            style={{
              color: textColor,
              fontSize: textSize,
              fontWeight: textBold ? 700 : 400,
              fontStyle: textItalic ? "italic" : "normal",
              WebkitTextStroke:
                strokeWidth > 0
                  ? `${strokeWidth}px ${strokeColor}`
                  : undefined,
              // Paint stroke OUTSIDE the letterforms so thick strokes
              // don't eat the readable inner shape of the glyph.
              paintOrder: "stroke fill",
            }}
          >
            {slide.text}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
