# Block "Area" nomenclature debt (Shape → Area)

**Context.** The block maker's filter was renamed at the label level:

| Old label | New label |
|---|---|
| "Block Shape" (filter heading) | **"Block Area"** |
| "Horizontal" | **"Standard Blocks"** (main-column blocks) |
| "Vertical" | **"Side Blocks"** (side-column blocks) |

Only the **visible labels** changed. The underlying data value and all the code
names still say `shape` / `horizontal` / `vertical`, so those are now misnamed
relative to what they mean. This file is the plan to rename them so the system
is internally consistent. Until then, the `SHAPE_LABELS` map in
`src/app/admin/(default)/blocks/page.tsx` bridges the gap.

## Target names

| Concept | Now (debt) | Target |
|---|---|---|
| DB column on `block_types` | `shape` | `area` |
| stored values | `"horizontal"` / `"vertical"` | `"standard"` / `"side"` |
| URL filter param | `?shape=` | `?area=` |
| TS type | `Shape` | `BlockArea` |
| icon exports | `HorizontalIcon` / `VerticalIcon` | `StandardIcon` / `SideIcon` |
| badge component | `ShapeBadge` | `AreaBadge` |
| label map | `SHAPE_LABELS` | `AREA_LABELS` |

(The blocks themselves are still visually wide vs tall; "area" describes where
they go — main column vs side column — which is the real distinction.)

## Inventory (what to change)

**Database**
- `block_types.shape` column (added by an earlier migration), values
  `horizontal` / `vertical` on every row.

**Code**
- `src/app/admin/(default)/blocks/page.tsx` — `type Shape`, `SHAPE_LABELS`,
  the `shape` search param, `selectedShape`, `withParams({ shape })`, the
  `fetchTypes` select of `shape`, the default `shape: "horizontal"`, and the
  filter buttons.
- `src/components/admin/blocks/ShapeIcon.tsx` — `HorizontalIcon`,
  `VerticalIcon`, `ShapeBadge`, and the doc comments.
- `src/types/blocks.ts` — the Info Card comment ("the first VERTICAL block
  (shape='vertical')").
- Any migration/seed that writes `block_types.shape` (grep
  `supabase/migrations` for `shape`).

## Plan (one coordinated, backward-compatible refactor)

1. **Migration** `NNNN_block_area_rename.sql` (idempotent):
   - `alter table block_types add column if not exists area text;`
   - Backfill: `update block_types set area = case when shape = 'vertical' then 'side' else 'standard' end where area is null;`
   - Keep the old `shape` column for one deploy so nothing breaks mid-rollout;
     drop it in a later migration once code no longer reads it.
2. **Code**: introduce `BlockArea = "standard" | "side"`, read `area` (fall back
   to deriving from `shape` while both exist), rename the param to `area`,
   rename the icons/badge/labels, and update comments. The `SHAPE_LABELS`
   bridge is deleted at this point.
3. **Filter param**: support `?area=` and, for one release, still honor a stale
   `?shape=` link by mapping it, then drop it.
4. **Cleanup migration**: `alter table block_types drop column shape;` after the
   code ships and is verified.

## Notes

- This is a low-urgency internal-consistency cleanup, not a bug. The labels are
  already correct for users; this makes the data/code match.
- Coordinate with the block-system owner before the DB column rename, since
  other tooling may read `block_types.shape`.
