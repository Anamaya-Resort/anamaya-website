import type { SectionFrame } from "@/types/blocks";

/**
 * Decorative image overlay anchored to one of six positions on the
 * parent section. Used for botanical illustrations, ornaments, gradient
 * washes, etc. The parent section needs `relative` + `overflow-hidden`
 * so this can bleed off the edge with negative offsets.
 *
 * Mobile: hidden by default — keeps the content area centered and
 * uncluttered on narrow viewports. Set decoration_show_mobile to true
 * to opt in.
 */
export default function DecorationOverlay({ frame }: { frame?: SectionFrame }) {
  if (!frame?.decoration_url) return null;

  const size = frame.decoration_size_px ?? 240;
  const opacity = (frame.decoration_opacity ?? 100) / 100;
  const offsetX = frame.decoration_offset_x_px ?? 0;
  const offsetY = frame.decoration_offset_y_px ?? 0;
  const position = frame.decoration_position ?? "top-right";
  const flip = flipTransform(frame.decoration_flip_x, frame.decoration_flip_y);

  const style: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: "auto",
    opacity,
    pointerEvents: "none",
    transform: flip,
    transformOrigin: "center",
  };

  switch (position) {
    case "top-left":
      style.top = offsetY;
      style.left = offsetX;
      break;
    case "top-right":
      style.top = offsetY;
      style.right = offsetX;
      break;
    case "bottom-left":
      style.bottom = offsetY;
      style.left = offsetX;
      break;
    case "bottom-right":
      style.bottom = offsetY;
      style.right = offsetX;
      break;
    case "left-center":
      style.top = "50%";
      style.left = offsetX;
      style.transform = `${flip} translateY(-50%)`.trim();
      break;
    case "right-center":
      style.top = "50%";
      style.right = offsetX;
      style.transform = `${flip} translateY(-50%)`.trim();
      break;
  }

  const className = frame.decoration_show_mobile ? "" : "hidden md:block";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={frame.decoration_url}
      alt={frame.decoration_alt ?? ""}
      aria-hidden={frame.decoration_alt ? undefined : "true"}
      style={style}
      className={className}
      loading="lazy"
    />
  );
}

function flipTransform(flipX?: boolean, flipY?: boolean): string {
  const x = flipX ? -1 : 1;
  const y = flipY ? -1 : 1;
  if (x === 1 && y === 1) return "";
  return `scale(${x}, ${y})`;
}
