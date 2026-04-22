// Render already-rewritten HTML with Tailwind-like prose styling.
// We don't use @tailwindcss/typography because we want tight control over
// colors and spacing to match the site palette.

type Props = {
  html: string;
  className?: string;
};

export default function ProseHtml({ html, className = "" }: Props) {
  return (
    <div
      className={`prose-anamaya ${className}`}
      // Body HTML has already been sanitized via our extractor + URL rewrite.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
