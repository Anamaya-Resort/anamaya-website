"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { BookingCalendarContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: BookingCalendarContent | null | undefined): BookingCalendarContent {
  return {
    retreat_type: c?.retreat_type ?? "all",
    only_available: c?.only_available ?? false,
  };
}

export default function BookingCalendarEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: BookingCalendarContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<BookingCalendarContent>
      {...props}
      typeSlug="booking_calendar"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<BookingCalendarContent> }) {
  const { draft, patch } = state;
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Which retreats to show</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            The calendar is fed live from AnamayaOS (public, confirmed, upcoming).
            Use these to gate what appears. Booking always hands off to Retreat Guru.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Retreat type</span>
            <select
              className={inputCls}
              value={draft.retreat_type ?? "all"}
              onChange={(e) =>
                patch({ retreat_type: e.target.value as BookingCalendarContent["retreat_type"] })
              }
            >
              <option value="all">All upcoming retreats</option>
              <option value="ytt">Yoga Teacher Trainings only</option>
              <option value="retreat">Weekly retreats only (no YTTs)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.only_available ?? false}
              onChange={(e) => patch({ only_available: e.target.checked })}
            />
            <span className="text-sm text-anamaya-charcoal">
              Only show available retreats (hide sold-out)
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
