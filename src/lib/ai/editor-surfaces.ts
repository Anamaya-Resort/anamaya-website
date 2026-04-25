"use client";

/**
 * Editor surface registry. Any client component that hosts editable text
 * (textarea, input, future contenteditable) can register itself here so
 * the global AI panel knows which fields are "real" — i.e. eligible for
 * Replace selection / Insert at cursor.
 *
 * Module-level singleton: surfaces self-register on mount and unregister
 * on unmount via the returned disposer. The toolbar / panel read from
 * this registry imperatively when the user makes a selection — no React
 * reactivity needed here.
 */

export type SurfaceSelection = {
  start: number;
  end: number;
  text: string;
};

export type EditorSurface = {
  id: string;
  /** Element the surface is attached to. Used to test selection containment. */
  element: HTMLTextAreaElement | HTMLInputElement;
  getValue(): string;
  setValue(value: string): void;
  getSelection(): SurfaceSelection | null;
  /** Replace the current selection with `replacement`. No-op if nothing selected. */
  replaceSelection(replacement: string): void;
  /**
   * Replace a specific range with `replacement`. Used when the panel
   * remembers a selection from before focus moved away — the live DOM
   * selection is gone, but the surface still knows the original offsets.
   */
  replaceRange(start: number, end: number, replacement: string): void;
  /** Insert at the caret. Replaces selection if any. */
  insertAtCursor(text: string): void;
  /** Optional context the AI tools can use to ground their prompts. */
  getPageContext?(): Record<string, unknown>;
};

const registry = new Map<string, EditorSurface>();
let counter = 0;

export function nextSurfaceId(prefix = "ai-surface"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function registerSurface(surface: EditorSurface): () => void {
  registry.set(surface.id, surface);
  return () => {
    if (registry.get(surface.id) === surface) registry.delete(surface.id);
  };
}

export function getSurface(id: string): EditorSurface | undefined {
  return registry.get(id);
}

/** Find the surface that owns the current document selection, if any. */
export function findSurfaceForActiveSelection(): EditorSurface | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!active) return null;
  for (const s of registry.values()) {
    if (s.element === active) return s;
  }
  return null;
}
