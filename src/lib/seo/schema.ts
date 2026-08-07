import "server-only";
import { getOrganizationContext } from "@/lib/ai/organization";

/**
 * Central per-page schema (structured data) engine.
 *
 * Emits ONE connected schema.org @graph per page rather than scattered nodes,
 * so search + AI/answer engines read the site as a coherent entity:
 *   - a canonical Resort/LodgingBusiness node (@id = <origin>/#resort), built
 *     from the property record in AnamayaOS (address, geo, phone, ...);
 *   - a WebSite node (@id = <origin>/#website) published by the resort;
 *   - a WebPage node for the current page, linked to both;
 *   - a BreadcrumbList.
 *
 * Every other page type (retreat Event, FAQ, reviews, amenities) plugs into
 * this same graph over time. `sameAs`, `aggregateRating`, `amenityFeature`,
 * and `image`/`logo` are intentionally left out until those fields exist on
 * the AnamayaOS property record.
 */

const FALLBACK_ORIGIN = "https://anamaya.com";

type JsonLdNode = Record<string, unknown>;

export type PageSchemaInput = {
  /** Path of the current page, e.g. "/" or "/accommodations/". */
  pathname: string;
  title: string;
  description?: string;
  /** Absolute URL of the page's primary image (OG image), if any. */
  image?: string;
  /** Overrides the WebPage subtype (default "WebPage"). */
  pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  /** Explicit breadcrumb; when omitted, derived from the path. */
  breadcrumb?: { name: string; url: string }[];
};

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Canonical site origin (no trailing slash) from the resort's website_url,
 *  falling back to the production domain. */
function originFrom(websiteUrl: string | null | undefined): string {
  const raw = (websiteUrl || FALLBACK_ORIGIN).trim();
  try {
    return trimTrailingSlash(new URL(raw).origin);
  } catch {
    return FALLBACK_ORIGIN;
  }
}

function absUrl(origin: string, pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${p}`;
}

function titleize(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map the AnamayaOS property_type to the closest schema.org LodgingBusiness
 *  subtype. */
function lodgingType(propertyType: string | null | undefined): string {
  switch (propertyType) {
    case "hotel":
    case "boutique_hotel":
      return "Hotel";
    case "resort":
    case "retreat_center":
    case "wellness_center":
      return "Resort";
    default:
      return "LodgingBusiness";
  }
}

type Prop = NonNullable<
  Awaited<ReturnType<typeof getOrganizationContext>>
>["properties"][number];

function buildResortNode(origin: string, prop: Prop, resortId: string): JsonLdNode {
  const address: JsonLdNode = { "@type": "PostalAddress" };
  if (prop.address_line1) address.streetAddress = prop.address_line1;
  if (prop.city) address.addressLocality = prop.city;
  if (prop.state_province) address.addressRegion = prop.state_province;
  if (prop.postal_code) address.postalCode = prop.postal_code;
  if (prop.country) address.addressCountry = prop.country;

  const node: JsonLdNode = {
    "@type": lodgingType(prop.property_type),
    "@id": resortId,
    name: prop.name,
    url: `${origin}/`,
  };
  const description = prop.description || prop.tagline;
  if (description) node.description = description;
  if (Object.keys(address).length > 1) node.address = address;
  // Coerce numerics — PostgREST can return numeric/int columns as strings.
  const num = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lat = num(prop.latitude);
  const lng = num(prop.longitude);
  if (lat != null && lng != null) {
    node.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }
  if (prop.phone) node.telephone = prop.phone;
  if (prop.email) node.email = prop.email;

  // Brand/schema fields from AnamayaOS.
  if (prop.same_as && prop.same_as.length) node.sameAs = prop.same_as;
  const ratingValue = num(prop.rating_value);
  const ratingCount = num(prop.rating_count);
  if (ratingValue != null && ratingCount != null && ratingCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount: ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (prop.amenities && prop.amenities.length) {
    node.amenityFeature = prop.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    }));
  }
  if (prop.price_range) node.priceRange = prop.price_range;
  if (prop.logo_url) {
    node.logo = prop.logo_url;
    node.image = prop.logo_url;
  }
  return node;
}

function buildBreadcrumb(
  origin: string,
  input: PageSchemaInput,
  breadcrumbId: string,
): JsonLdNode | null {
  let items = input.breadcrumb;
  if (!items) {
    const segs = trimTrailingSlash(input.pathname).split("/").filter(Boolean);
    if (segs.length === 0) return null; // home: no breadcrumb
    const acc: { name: string; url: string }[] = [{ name: "Home", url: `${origin}/` }];
    let path = "";
    segs.forEach((seg, i) => {
      path += `/${seg}`;
      const last = i === segs.length - 1;
      acc.push({ name: last ? input.title : titleize(seg), url: `${origin}${path}/` });
    });
    items = acc;
  }
  if (items.length < 2) return null;
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** Assemble the full @graph object for a page. */
export async function buildPageGraph(input: PageSchemaInput): Promise<JsonLdNode> {
  const ctx = await getOrganizationContext();
  const prop = ctx?.properties?.[0] ?? null;
  const origin = originFrom(prop?.website_url);

  const resortId = `${origin}/#resort`;
  const websiteId = `${origin}/#website`;
  const pageUrl = absUrl(origin, input.pathname);
  const isHome = trimTrailingSlash(input.pathname) === "";
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": websiteId,
    url: `${origin}/`,
    name: prop?.name ?? ctx?.org?.name ?? "Anamaya",
  };
  if (prop) website.publisher = { "@id": resortId };

  const breadcrumb = buildBreadcrumb(origin, input, breadcrumbId);

  const webpage: JsonLdNode = {
    "@type": isHome ? "WebPage" : input.pageType ?? "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.title,
    isPartOf: { "@id": websiteId },
  };
  if (input.description) webpage.description = input.description;
  if (prop) webpage.about = { "@id": resortId };
  if (input.image) webpage.primaryImageOfPage = input.image;
  if (breadcrumb) webpage.breadcrumb = { "@id": breadcrumbId };

  const graph: JsonLdNode[] = [website];
  if (prop) graph.push(buildResortNode(origin, prop, resortId));
  graph.push(webpage);
  if (breadcrumb) graph.push(breadcrumb);

  return { "@context": "https://schema.org", "@graph": graph };
}

/** Escape so a value containing </script>, <, or & can't break out of the
 *  <script type="application/ld+json"> element. Valid JSON string escapes,
 *  so parsers are unaffected. */
export function jsonLdToHtml(node: unknown): string {
  return JSON.stringify(node)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
