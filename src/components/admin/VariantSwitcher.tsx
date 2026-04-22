"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BlockTypeSlug } from "@/types/blocks";
import PressBarBlock from "@/components/blocks/PressBarBlock";
import RichTextBlock from "@/components/blocks/RichTextBlock";
import CtaBannerBlock from "@/components/blocks/CtaBannerBlock";

// Using the Hero block in a scaled preview is tricky because HeroBlock is a
// client component that registers with HeaderContext — skip Hero for now
// (shows name swatch only).

type VariantSummary = {
  id: string;
  name: string;
  content: unknown;
};

const PAGE_SIZE = 4;
const TILE_WIDTH = 280; // px — visible width of each tile
const PREVIEW_NATIVE_WIDTH = 1600;
const SCALE = TILE_WIDTH / PREVIEW_NATIVE_WIDTH;

export default function VariantSwitcher({
  currentId,
  typeSlug,
  typeName,
  variants,
}: {
  currentId: string;
  typeSlug: BlockTypeSlug;
  typeName: string;
  variants: VariantSummary[];
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(variants.length / PAGE_SIZE));
  const window = useMemo(
    () => variants.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [variants, page],
  );

  if (variants.length <= 1) {
    return (
      <section className="mb-8">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/60">
          Variants
        </h3>
        <p className="rounded-md bg-white px-4 py-3 text-sm italic text-anamaya-charcoal/60 ring-1 ring-zinc-200">
          This is the only {typeName.toLowerCase()} block. Duplicate it to create a variant.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/60">
          Variants ({variants.length})
        </h3>
        {pages > 1 && (
          <div className="flex items-center gap-2 text-xs text-anamaya-charcoal/60">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold hover:bg-zinc-50 disabled:opacity-30"
              aria-label="Previous variants"
            >
              ‹
            </button>
            <span>
              {page + 1}/{pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold hover:bg-zinc-50 disabled:opacity-30"
              aria-label="Next variants"
            >
              ›
            </button>
          </div>
        )}
      </header>

      <ul className="flex items-start gap-3 overflow-hidden">
        {window.map((v) => (
          <li key={v.id} className="shrink-0">
            <Link
              href={`/admin/blocks/${v.id}`}
              className={`block rounded-md bg-white ring-1 transition-all ${
                v.id === currentId
                  ? "ring-2 ring-anamaya-green"
                  : "ring-zinc-200 hover:ring-anamaya-charcoal/30"
              }`}
              style={{ width: TILE_WIDTH }}
            >
              <div className="border-b border-zinc-100 px-3 py-2 text-xs">
                <div className="truncate font-semibold text-anamaya-charcoal">
                  {v.name}
                </div>
                {v.id === currentId && (
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-green">
                    Editing
                  </div>
                )}
              </div>
              <div
                className="overflow-hidden bg-zinc-50"
                style={{ height: 80 }}
                aria-hidden="true"
              >
                <div
                  style={{
                    width: PREVIEW_NATIVE_WIDTH,
                    transform: `scale(${SCALE})`,
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                >
                  <MiniRenderer typeSlug={typeSlug} content={v.content} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniRenderer({
  typeSlug,
  content,
}: {
  typeSlug: BlockTypeSlug;
  content: any;
}) {
  switch (typeSlug) {
    case "press_bar":  return <PressBarBlock content={content} />;
    case "rich_text":  return <RichTextBlock content={content} />;
    case "cta_banner": return <CtaBannerBlock content={content} />;
    default:
      return (
        <div className="flex h-20 items-center justify-center bg-zinc-100 text-xs text-anamaya-charcoal/50">
          Preview not available for {typeSlug}
        </div>
      );
  }
}
