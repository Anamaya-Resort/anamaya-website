"use client";

import type { HeroContent } from "@/types/blocks";

/**
 * Placeholder while the full Hero With Video editor is being built
 * (top band / video / bottom band). Kept minimal so the rest of the
 * admin keeps compiling.
 */
export default function HeroEditor({
  content: _content,
  onSave: _onSave,
}: {
  content: HeroContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  return (
    <div className="rounded-lg bg-white p-6 text-sm text-anamaya-charcoal/60 shadow-sm ring-1 ring-zinc-200">
      Hero With Video editor — coming shortly.
    </div>
  );
}
