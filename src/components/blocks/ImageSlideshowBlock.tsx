import type { ImageSlideshowContent, ImageSlideshowSlide } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { buildGoogleFontsUrl, getSlideshowFont } from "@/lib/slideshow-fonts";
import SlideshowCarousel from "./shared/SlideshowCarousel";

/**
 * Full-width image slideshow with crossfade. Each slide carries its
 * own image + complete text-overlay configuration (font, size,
 * colour, alignment, position, stroke). All slides server-render
 * into the initial HTML for SEO + LLM crawlers; a small client island
 * toggles opacity to crossfade between them.
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

  return (
    <>
      {/* Loads the entire slideshow-font set in one request. Font
          files only fetch when actually rendered, so listing all
          faces is cheap. */}
      <link rel="stylesheet" href={buildGoogleFontsUrl()} />
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
    </>
  );
}

function Slide({
  slide,
  firstVisible,
  fadeSeconds,
  imageFit,
  overlayOpacity,
}: {
  slide: ImageSlideshowSlide;
  firstVisible: boolean;
  fadeSeconds: number;
  imageFit: "cover" | "contain";
  overlayOpacity: number;
}) {
  const font = getSlideshowFont(slide.text_font);
  const textSize = slide.text_size_px ?? 64;
  const textColor = resolveBrandColor(slide.text_color) ?? "#ffffff";
  const align = slide.text_align ?? "center";
  const position = slide.text_position ?? "center";
  const bold = slide.text_bold ?? false;
  const italic = slide.text_italic ?? false;

  const strokeWidth = clamp(slide.text_stroke_width_px ?? 0, 0, 20);
  const strokeColor = resolveBrandColor(slide.text_stroke_color) ?? "#000000";

  const positionClass =
    position === "top"
      ? "items-start"
      : position === "bottom"
        ? "items-end"
        : "items-center";
  const alignClass =
    align === "left"
      ? "justify-start text-left"
      : align === "right"
        ? "justify-end text-right"
        : "justify-center text-center";

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
            className="max-w-5xl leading-tight"
            style={{
              fontFamily: font.family,
              color: textColor,
              fontSize: textSize,
              fontWeight: bold ? 700 : 400,
              fontStyle: italic ? "italic" : "normal",
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
