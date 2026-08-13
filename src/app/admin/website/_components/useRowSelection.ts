"use client";

import { useCallback, useState } from "react";

/**
 * Shared client-side row-selection state for the admin list views.
 *
 * Holds a Set of selected row ids and the helpers the list toolbars need:
 * per-row toggle, bulk select/deselect (for a "select all" checkbox), a
 * clear, and a live count. Used by both the per-type list (ListShell) and
 * the combined Deleted view (DeletedListShell) so bulk selection behaves
 * identically in both places.
 */
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Add or remove a batch of ids at once — drives the header "select all"
  // checkbox against the currently visible rows.
  const setMany = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    count: selected.size,
    isSelected,
    toggle,
    setMany,
    clear,
  };
}
