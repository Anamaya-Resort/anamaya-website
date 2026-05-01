-- ============================================================
-- 0026: Activate the ui_agent overlay block
--
-- 0025 seeded ui_agent as inactive (placeholder). Now that the
-- block has a real renderer (UiAgentBlock wraps the existing
-- VisitorAgent component), flip it active and add a default
-- instance to the site_chrome template so it ships with every
-- public page just like the top bar and side menu.
--
-- The agent's visibility on the live site still gates on
-- /api/ai/agent-config (per-tenant enable/disable). The block
-- only controls placement/scope.
-- ============================================================

update public.block_types
   set is_active   = true,
       name        = 'UI · AI Agent',
       description = 'Floating AI assistant bubble. Visibility on the live site gates on /api/ai/agent-config (per-tenant). Optional property_id_scope narrows retrieval to a sub-property.'
 where slug = 'ui_agent';

insert into public.blocks (id, type_slug, slug, name, content)
values (
  '22222222-2222-2222-2222-222222222223',
  'ui_agent',
  'ui_agent_default',
  'Site AI Agent — Default',
  jsonb_build_object(
    'overlay_z',         40,
    'overlay_anchor',    'bottom',
    'overlay_trigger',   'always',
    'property_id_scope', null
  )
)
on conflict (slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order)
select v.id, b.id, 30
  from public.page_template_variants v
  join public.blocks b on b.slug = 'ui_agent_default'
 where v.slug = 'site_chrome_default'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );
