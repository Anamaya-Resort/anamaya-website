import "server-only";
import { cache } from "react";
import { aoSupabaseOrNull } from "@/lib/ao-supabase";

/**
 * Identity bundle for the active tenant — the org plus its sub-properties.
 *
 * Sourced from AnamayOS Supabase (organizations + org_properties) via the
 * anon key. Properties inherit unset fields from their parent org via
 * `mergeWithProperty(propertyId)`.
 */

export type Disclaimers = {
  booking?: string | null;
  medical?: string | null;
  legal?: string | null;
};

export type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  tagline: string | null;
  industry: string | null;
  primary_offering: string | null;
  locale: string | null;
  timezone: string | null;
  booking_url: string | null;
  contact_url: string | null;
  sensitive_topics: string[] | null;
  disclaimers: Disclaimers | null;
  visitor_agent_enabled: boolean;
  visitor_agent_brand_guide_id: string | null;
  visitor_agent_question_templates: Record<string, string[]> | null;
};

export type PropertyRow = {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  description: string | null;
  property_type: string | null;
  property_type_custom: string | null;
  tagline: string | null;
  industry: string | null;
  primary_offering: string | null;
  locale: string | null;
  timezone: string | null;
  booking_url: string | null;
  contact_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  nearest_airport: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  sensitive_topics: string[] | null;
  disclaimers: Disclaimers | null;
  sort_order: number | null;
};

/** Fields a property may override on the parent org. */
const OVERRIDABLE_KEYS = [
  "tagline",
  "industry",
  "primary_offering",
  "locale",
  "timezone",
  "booking_url",
  "contact_url",
  "sensitive_topics",
  "disclaimers",
] as const;

export type EffectiveIdentity = {
  name: string;
  legal_name: string | null;
  tagline: string | null;
  industry: string | null;
  primary_offering: string | null;
  locale: string | null;
  timezone: string | null;
  booking_url: string | null;
  contact_url: string | null;
  sensitive_topics: string[] | null;
  disclaimers: Disclaimers | null;
  /** When a property is in scope, its physical/contact info; else null. */
  property: {
    id: string;
    slug: string;
    name: string;
    address_line1: string | null;
    city: string | null;
    state_province: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    nearest_airport: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

export type OrganizationContext = {
  org: OrganizationRow;
  properties: PropertyRow[];
  /** Resolve the effective identity, optionally scoped to a property. */
  resolve(propertyId?: string | null): EffectiveIdentity;
};

const EMPTY_QUESTION_TEMPLATES: Record<string, string[]> = {};

/**
 * Returns the active tenant's identity bundle. Memoized per request via
 * React's `cache()` — repeat calls in one render share a single fetch.
 *
 * Returns null when AO is unreachable (env vars missing or query failed)
 * so admin pages can degrade rather than crash.
 */
export const getOrganizationContext = cache(
  async (): Promise<OrganizationContext | null> => {
    const ao = aoSupabaseOrNull();
    if (!ao) return null;

    const slug = process.env.AO_ORG_SLUG;
    if (!slug) return null;

    const { data: orgRow } = await ao
      .from("organizations")
      .select(
        "id, slug, name, legal_name, tagline, industry, primary_offering, locale, timezone, booking_url, contact_url, sensitive_topics, disclaimers, visitor_agent_enabled, visitor_agent_brand_guide_id, visitor_agent_question_templates, is_active",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!orgRow) return null;

    const { data: propRows } = await ao
      .from("org_properties")
      .select(
        "id, org_id, slug, name, description, property_type, property_type_custom, tagline, industry, primary_offering, locale, timezone, booking_url, contact_url, address_line1, address_line2, city, state_province, country, postal_code, latitude, longitude, nearest_airport, phone, email, website_url, sensitive_topics, disclaimers, sort_order",
      )
      .eq("org_id", orgRow.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const org: OrganizationRow = {
      id: orgRow.id,
      slug: orgRow.slug,
      name: orgRow.name,
      legal_name: orgRow.legal_name,
      tagline: orgRow.tagline,
      industry: orgRow.industry,
      primary_offering: orgRow.primary_offering,
      locale: orgRow.locale,
      timezone: orgRow.timezone,
      booking_url: orgRow.booking_url,
      contact_url: orgRow.contact_url,
      sensitive_topics: orgRow.sensitive_topics ?? null,
      disclaimers: (orgRow.disclaimers as Disclaimers | null) ?? null,
      visitor_agent_enabled: !!orgRow.visitor_agent_enabled,
      visitor_agent_brand_guide_id: orgRow.visitor_agent_brand_guide_id,
      visitor_agent_question_templates:
        (orgRow.visitor_agent_question_templates as Record<
          string,
          string[]
        > | null) ?? EMPTY_QUESTION_TEMPLATES,
    };

    const properties: PropertyRow[] = (propRows ?? []).map((p) => ({
      ...p,
      sensitive_topics: (p.sensitive_topics as string[] | null) ?? null,
      disclaimers: (p.disclaimers as Disclaimers | null) ?? null,
    }));

    return {
      org,
      properties,
      resolve(propertyId) {
        return resolveIdentity(org, properties, propertyId);
      },
    };
  },
);

function resolveIdentity(
  org: OrganizationRow,
  properties: PropertyRow[],
  propertyId?: string | null,
): EffectiveIdentity {
  const base: EffectiveIdentity = {
    name: org.name,
    legal_name: org.legal_name,
    tagline: org.tagline,
    industry: org.industry,
    primary_offering: org.primary_offering,
    locale: org.locale,
    timezone: org.timezone,
    booking_url: org.booking_url,
    contact_url: org.contact_url,
    sensitive_topics: org.sensitive_topics,
    disclaimers: org.disclaimers,
    property: null,
  };
  if (!propertyId) return base;
  const prop = properties.find((p) => p.id === propertyId);
  if (!prop) return base;

  // Apply each overridable field: property non-null beats org.
  for (const key of OVERRIDABLE_KEYS) {
    const v = prop[key];
    if (v !== null && v !== undefined) {
      // The cast is safe because OVERRIDABLE_KEYS are by construction
      // present on EffectiveIdentity with compatible types.
      (base as Record<string, unknown>)[key] = v;
    }
  }

  base.property = {
    id: prop.id,
    slug: prop.slug,
    name: prop.name,
    address_line1: prop.address_line1,
    city: prop.city,
    state_province: prop.state_province,
    country: prop.country,
    latitude: prop.latitude,
    longitude: prop.longitude,
    nearest_airport: prop.nearest_airport,
    phone: prop.phone,
    email: prop.email,
  };
  return base;
}
