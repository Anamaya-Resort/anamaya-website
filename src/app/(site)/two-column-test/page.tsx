import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import TemplateRenderer from "@/components/templates/TemplateRenderer";

export const dynamic = "force-dynamic";

// Test/preview page — keep it out of search indexes.
export const metadata: Metadata = {
  title: "Two-Column Template — Test",
  robots: { index: false, follow: false },
};

/**
 * Preview of the two-column template capability. The `two_col_test` template
 * mixes horizontal blocks (main column) with two vertical Info Cards (side
 * column): one Fixed, one Hidden. On desktop the main column narrows and the
 * vertical blocks sit in a sticky side column; on a phone the Fixed card
 * stacks inline and the Hidden card tucks into the left slide-out tab.
 */
export default async function TwoColumnTestPage() {
  return (
    <>
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />

      <main className="min-h-screen bg-anamaya-cream pt-24 pb-16">
        <div className="mx-auto mb-8 max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-anamaya-green">
            Template test
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-anamaya-charcoal">
            Two-Column Template
          </h1>
          <p className="mt-2 text-sm italic text-anamaya-charcoal/60">
            Horizontal blocks fill the main column; the vertical Info Cards sit in the sticky side
            column. Narrow the window (or use a phone) to see the Fixed card stack inline and the
            Hidden card collapse to the left-edge tab.
          </p>
        </div>

        <TemplateRenderer templateSlug="two_col_test" />
      </main>
    </>
  );
}
