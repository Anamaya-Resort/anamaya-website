import { getBrandTokens } from "@/lib/brand-tokens";
import { COLOR_KEY_TO_CSS_VAR, type BrandingColors } from "@/config/brand-tokens";

/**
 * Injects the brand's CSS variables (`--brand-*`, `--destructive`, `--radius`,
 * etc.) into the document so every block renderer and editor reads from the
 * same palette. Values come from AnamayaOS's `org_branding` row.
 *
 * Render once in the root layout's <head>. Cheap: one tiny inline <style>.
 */
export default async function BrandTokensStyle() {
  const b = await getBrandTokens();

  const colorDecls = (mode: BrandingColors) =>
    (Object.keys(COLOR_KEY_TO_CSS_VAR) as (keyof BrandingColors)[])
      .map((k) => {
        const v = mode[k];
        return v ? `${COLOR_KEY_TO_CSS_VAR[k]}:${v}` : "";
      })
      .filter(Boolean)
      .join(";");

  const css = `
:root {
  ${colorDecls(b.light)};
  --brand-font-heading:${JSON.stringify(b.fontHeading)};
  --brand-font-body:${JSON.stringify(b.fontBody)};
  --radius:${b.radius}px;
  --brand-bg:${b.backgroundColor};
  --brand-bg-image:${b.backgroundImageUrl ? `url(${JSON.stringify(b.backgroundImageUrl)})` : "none"};
  --brand-bg-opacity:${b.backgroundOpacity};
  --brand-bg-blend:${b.backgroundBlendMode};
}
.dark {
  ${colorDecls(b.dark)};
  --brand-bg:${b.backgroundColorDark};
}
`.trim();

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
