-- Phase 6 prep: tag inventory rows with the AnamayOS property they belong to.
--
-- The property catalogue lives in AnamayOS (org_properties). The website
-- never has a real FK across projects, so this is a plain uuid column that
-- the editor populates from a dropdown sourced via getOrganizationContext().
-- Null means "no property scope" — the page belongs to the org as a whole.

alter table public.url_inventory
  add column if not exists property_id uuid;

comment on column public.url_inventory.property_id is
  'AnamayOS org_properties.id this page belongs to. Logical FK only — the property catalogue lives in the AO Supabase project. Null = org-wide.';

create index if not exists url_inventory_property_id_idx
  on public.url_inventory(property_id)
  where property_id is not null;
