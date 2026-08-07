import { buildPageGraph, jsonLdToHtml, type PageSchemaInput } from "@/lib/seo/schema";

/**
 * Renders the page's schema.org @graph as a single JSON-LD script. Server
 * component, so the structured data is in the SSR response for crawlers and
 * AI/answer engines. Drop it near the top of a route's output.
 *
 * Best-effort: if the org/property data is unavailable it still emits a
 * minimal WebSite + WebPage graph rather than throwing.
 */
export default async function PageSchema(props: PageSchemaInput) {
  let html: string;
  try {
    const graph = await buildPageGraph(props);
    html = jsonLdToHtml(graph);
  } catch {
    return null;
  }
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
