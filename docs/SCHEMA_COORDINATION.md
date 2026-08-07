# Structured-data (schema.org) coordination

**Purpose:** two Claude agents are working on structured data for this site at
the same time — one on **page/site schema** (Article, Organization, etc.) and
one on **FAQ schema**. This file is the single source of truth for **who owns
what** so we don't emit duplicate or conflicting JSON-LD. Read this before
touching any `<script type="application/ld+json">` or any schema.org markup.

Keep it updated: edit your own section, date your changes, and don't rewrite the
other agent's section.

---

## The golden rule

**Each schema.org type has exactly ONE emitter.** If you're about to output a
JSON-LD node, check the ownership table first. If it's owned by the other agent,
don't emit it — coordinate here instead.

---

## Ownership

| Schema type | Owner | Emitted by | Notes |
|---|---|---|---|
| `FAQPage`, `Question`, `Answer`, `SpeakableSpecification` (for FAQs) | **FAQ agent** | `src/components/blocks/FaqBlock.tsx` | Per-page, from approved `page_faqs`. Do NOT emit FAQ nodes from page/site schema. |
| `Article` / `BlogPosting` | **Schema agent** | (page-level, TBD) | Per post/page. |
| `Organization` / `LodgingBusiness` / `WebSite` | **Schema agent** | site-wide (technical settings / layout) | Already partially present site-wide. |
| `WebPage`, `BreadcrumbList` | **Schema agent** | page-level | |
| `VideoObject` | (existing) | `HeroBlock.tsx` | Already emitted by the hero block. |
| Review / `AggregateRating` | (existing) | `TestimonialsBlock` / `TestimonialsSchema.tsx` | Already emitted by testimonials. |

If you need a type not listed, add a row here and claim it before building.

---

## The FAQ contract (owned by the FAQ agent)

- **Sole emitter:** FAQ structured data is emitted ONLY by the FAQ block
  (`FaqBlock.tsx`). The page/site schema must **not** emit `FAQPage` or FAQ
  `Question`/`Answer` nodes. Two emitters = duplicate FAQ nodes = a schema error.
- **Shape:** a single `FAQPage` node with `mainEntity: [{ @type: Question, name,
  acceptedAnswer: { @type: Answer, text } }, ...]`, plus a `speakable`
  (`SpeakableSpecification`, `cssSelector: [".faq-speakable"]`) pointing at the
  featured answers for voice/AI read-aloud.
- **When it renders:** only when the page (a) has a template that includes a
  `faq` block AND (b) has **approved** FAQs in `page_faqs` (gated by
  `page_faq_meta.approved`). Otherwise the block renders nothing and emits no
  schema. Server-rendered, so it's in the crawled HTML.
- **`.faq-speakable`:** the CSS class wrapping the featured answers
  (`FaqBlockView.tsx`). The schema agent should NOT target this selector with
  its own `speakable`.

### If we later want ONE combined `@graph` per page

Preferred future state is a single page-level `@graph` (WebPage + Article + FAQ,
cross-referenced by `@id`). When we do that:
1. The schema agent owns the graph assembly.
2. The FAQ block stops emitting its standalone `FAQPage` and instead exposes the
   page's approved FAQ items to the graph assembler (a small server helper), OR
   the graph references the FAQ node by `@id`.
3. **Only one** of these ships at a time — never both, or we double-emit.

Until we agree to do that here, the FAQ block keeps emitting its own standalone
`FAQPage` node (valid and working today).

---

## FAQ data model (reference for both agents)

- `page_faqs` — per-page Q&A rows (`url_inventory_id`, question, answer,
  `is_featured`, `sort_order`, `source`). Live set shown on a page.
- `page_faq_meta` — per-page publish gate (`approved`).
- `faq_sets` — reusable "FAQ-#" sets built in the two-panel builder
  (`/admin/website/faqs`); applying a set copies its items into a page's
  `page_faqs` and approves them.
- Builder + generator: `src/app/admin/website/faqs/*`,
  `src/lib/ai/faq-generator.ts`. Brand voice + avatars come live from AnamayOS
  (`ai_brand_guide`, `ai_customer_archetypes`).

---

## Shared blocker (both agents need to know)

As of 2026-Aug-07, **1002 of 1005 content pages are legacy** (no template, no
blocks). Only 3 pages use templates (`spa`, `home`, `book-retreat`). **No block
renders on a legacy page**, so neither FAQ schema nor Article/WebPage schema can
appear there until pages are moved onto templates. Getting schema onto lots of
pages depends on that template migration — plan around it together.

---

## Status log

- **2026-Aug-07 (FAQ agent):** FAQ block emits `FAQPage` + `speakable`; two-panel
  builder + reusable `faq_sets` shipped; FAQ block added to the `spa` template as
  the first live end-to-end target. FAQ schema fully owned here.
- _(Schema agent: add your status below.)_
