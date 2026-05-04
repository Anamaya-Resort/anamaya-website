"use client";

import { useState } from "react";
import { deleteTestimonialFromForm, updateTestimonialFromForm } from "./actions";

export type ListRow = {
  id: string;
  review_number: number | null;
  review_id: string;
  review_url: string | null;
  title: string | null;
  rating: number;
  date_of_stay: string | null;
  trip_type: string | null;
  author: string | null;
  review_text: string;
  published: boolean;
  updated_at: string | null;
};

/**
 * Client-side accordion list of testimonials. Each row has a chevron
 * on the far left. Clicking the chevron expands an inline edit form
 * beneath the row. Only one row can be open at a time.
 *
 * The expanded panel doubles as the edit screen — there is no
 * separate /admin/testimonials/[id] page anymore.
 */
export default function TestimonialsList({ items }: { items: ListRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Single source of truth so header + rows stay aligned.
  const cols =
    "grid grid-cols-[28px_56px_1fr_180px_220px] items-center gap-2";

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
      <div className={`${cols} bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60`}>
        <div />
        <div>#</div>
        <div>Title</div>
        <div>Reviewer</div>
        <div>Date / Trip</div>
      </div>

      <div className="divide-y divide-zinc-100">
        {items.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id}>
              <div
                className={`${cols} cursor-pointer px-4 py-3 text-sm transition-colors ${
                  open ? "bg-zinc-100" : "hover:bg-zinc-50/60"
                }`}
                onClick={() => setOpenId(open ? null : t.id)}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? "Collapse details" : "Expand details"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenId(open ? null : t.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-anamaya-charcoal/60 hover:bg-zinc-200 hover:text-anamaya-charcoal"
                >
                  <Chevron open={open} />
                </button>
                <div className="font-mono text-xs text-anamaya-charcoal/70">
                  {t.review_number ?? "—"}
                </div>
                <div className="truncate font-medium">
                  {t.title ?? <span className="text-anamaya-charcoal/40">—</span>}
                </div>
                <div className="truncate text-anamaya-charcoal/80">
                  {t.author ?? <span className="text-anamaya-charcoal/40">—</span>}
                </div>
                <div className="truncate text-xs text-anamaya-charcoal/70">
                  {[t.date_of_stay, t.trip_type].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>

              {open && <EditPanel t={t} onClose={() => setOpenId(null)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditPanel({ t, onClose }: { t: ListRow; onClose: () => void }) {
  return (
    <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-5">
      <form action={updateTestimonialFromForm} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={t.id} />

        <Input
          name="review_number"
          label="Review #"
          type="number"
          defaultValue={t.review_number ?? ""}
        />
        <Input
          name="review_id"
          label="Review ID"
          required
          defaultValue={t.review_id}
        />
        <Input
          name="review_url"
          label="Review URL"
          className="sm:col-span-2"
          defaultValue={t.review_url ?? ""}
        />
        <Input
          name="title"
          label="Title"
          className="sm:col-span-2"
          defaultValue={t.title ?? ""}
        />
        <Input
          name="author"
          label="Reviewer name"
          defaultValue={t.author ?? ""}
        />
        <Input
          name="date_of_stay"
          label="Date of stay"
          defaultValue={t.date_of_stay ?? ""}
        />
        <Input
          name="trip_type"
          label="Trip type"
          defaultValue={t.trip_type ?? ""}
        />
        <Input
          name="rating"
          label="Rating (1–5)"
          type="number"
          min={1}
          max={5}
          defaultValue={t.rating ?? 5}
        />

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
            Review text
          </label>
          <textarea
            name="review_text"
            required
            rows={8}
            defaultValue={t.review_text}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="published" defaultChecked={t.published} />
          Published (visible on site)
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-anamaya-charcoal/70 hover:underline"
          >
            Cancel
          </button>
          <div className="ml-auto">
            <DeleteButton id={t.id} />
          </div>
        </div>
      </form>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTestimonialFromForm}
      onSubmit={(e) => {
        if (!confirm("Delete this testimonial? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, className, ...rest } = props;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
        {label}
      </span>
      <input
        {...rest}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
      />
    </label>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
