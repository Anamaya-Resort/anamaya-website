"use client";

/**
 * Tiny pub/sub store for the AI panel. Lightweight on purpose — one
 * subscribe/notify pair, no Zustand dependency. The panel mounts as a
 * singleton; toolbar buttons and slash commands write here; the panel
 * reads via useSyncExternalStore.
 */

import { useSyncExternalStore } from "react";

export type PanelTab = "rewrite" | "write" | "ask" | "headlines";

export type PanelState = {
  isOpen: boolean;
  tab: PanelTab;
  /** When set, the panel pre-fills its input with this string. */
  seedInput: string;
  /** When set, "Replace selection" / "Insert at cursor" target this surface. */
  surfaceId: string | null;
  /**
   * Snapshot of the selection at the moment the panel was opened. If the
   * user clicks elsewhere mid-flow, we still remember where to write back.
   */
  selectionRange: { start: number; end: number } | null;
};

const initialState: PanelState = {
  isOpen: false,
  tab: "rewrite",
  seedInput: "",
  surfaceId: null,
  selectionRange: null,
};

let state: PanelState = initialState;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function set(patch: Partial<PanelState>) {
  state = { ...state, ...patch };
  notify();
}

export const panelStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  open(opts: {
    tab?: PanelTab;
    seedInput?: string;
    surfaceId?: string | null;
    selectionRange?: { start: number; end: number } | null;
  }) {
    set({
      isOpen: true,
      tab: opts.tab ?? state.tab,
      seedInput: opts.seedInput ?? "",
      surfaceId: opts.surfaceId ?? null,
      selectionRange: opts.selectionRange ?? null,
    });
  },
  close() {
    set({ isOpen: false });
  },
  setTab(tab: PanelTab) {
    set({ tab });
  },
};

export function usePanelState(): PanelState {
  return useSyncExternalStore(
    panelStore.subscribe,
    panelStore.getState,
    panelStore.getState,
  );
}
