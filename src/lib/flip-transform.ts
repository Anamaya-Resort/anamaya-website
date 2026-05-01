/**
 * CSS transform fragment for image flip booleans. Lives outside any
 * "use client" module so it can be imported by both server-rendered
 * block components (via TemplateRenderer) and client-side editors.
 *
 * Returns undefined when neither axis is flipped so callers can build
 * a combined transform without a stray empty string.
 */
export function flipTransform(flipX?: boolean, flipY?: boolean): string | undefined {
  if (!flipX && !flipY) return undefined;
  const parts: string[] = [];
  if (flipX) parts.push("scaleX(-1)");
  if (flipY) parts.push("scaleY(-1)");
  return parts.join(" ");
}
