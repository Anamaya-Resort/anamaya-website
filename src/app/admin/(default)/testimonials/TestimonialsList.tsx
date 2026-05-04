"use client";

import { useEffect, useState, useTransition } from "react";
import { playClick } from "@/lib/click-sound";
import {
  deleteTestimonialFromForm,
  setAssignmentVisibilityFromForm,
  updateTestimonialFromForm,
} from "./actions";

export type Category = {
  slug: string;
  name: string;
  excerpt: string | null;
  is_visible: boolean;
};

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
  categories: Category[];
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
    "grid grid-cols-[28px_56px_1.4fr_180px_180px_minmax(220px,1fr)] items-center gap-2";

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
      <div className={`${cols} bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60`}>
        <div />
        <div>#</div>
        <div>Title</div>
        <div>Reviewer</div>
        <div>Date / Trip</div>
        <div>Categories</div>
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
                <CategoryPills categories={t.categories} />
              </div>

              {open && <EditPanel t={t} onClose={() => setOpenId(null)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryPills({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return <span className="text-xs italic text-anamaya-charcoal/40">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <span
          key={c.slug}
          className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-anamaya-charcoal/80 ring-1 ring-zinc-200"
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

function EditPanel({ t, onClose }: { t: ListRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  // Briefly true after a successful save — drives the blue "Saved!"
  // confirmation state. A separate counter forces useEffect to re-run
  // even if multiple saves happen in quick succession.
  const [justSaved, setJustSaved] = useState(false);
  const [saveTick, setSaveTick] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!justSaved) return;
    const id = window.setTimeout(() => setJustSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [justSaved, saveTick]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateTestimonialFromForm(formData);
        playClick();
        setJustSaved(true);
        setSaveTick((n) => n + 1);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="id" value={t.id} />

        {/* Row 1: review # + review id */}
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>

        {/* Row 2: review URL + title */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            name="review_url"
            label="Review URL"
            defaultValue={t.review_url ?? ""}
          />
          <Input
            name="title"
            label="Title"
            defaultValue={t.title ?? ""}
          />
        </div>

        {/* Row 3: reviewer + date + trip type + rating, all on one row */}
        <div className="grid gap-3 sm:grid-cols-4">
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
        </div>

        {/* Review text — full width */}
        <div>
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

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={t.published} />
          Published (visible on site)
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={`rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-colors ${
              justSaved
                ? "bg-blue-600 hover:bg-blue-600"
                : pending
                  ? "bg-zinc-400"
                  : "bg-anamaya-green hover:bg-anamaya-green-dark"
            } disabled:cursor-not-allowed`}
          >
            {justSaved ? "Saved!" : pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-anamaya-charcoal/70 hover:underline"
          >
            Cancel
          </button>
          {errorMsg && (
            <span className="text-xs text-red-600">{errorMsg}</span>
          )}
          <div className="ml-auto">
            <DeleteButton id={t.id} />
          </div>
        </div>
      </form>

      {/* Separator between editable testimonial fields and the
          categories+excerpts section below. */}
      <hr className="my-6 border-zinc-300" />

      <CategoriesSection testimonialId={t.id} categories={t.categories} />
    </div>
  );
}

function CategoriesSection({
  testimonialId,
  categories,
}: {
  testimonialId: string;
  categories: Category[];
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
        Categories &amp; excerpts ({categories.length})
      </h3>
      {categories.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">
          Not assigned to any category yet. Add it from the Categories page on
          the testimonials index.
        </p>
      ) : (
        <ul className="space-y-3">
          {categories.map((c) => (
            <li
              key={c.slug}
              className={`rounded-md border p-3 ${
                c.is_visible
                  ? "border-zinc-200 bg-white"
                  : "border-zinc-200 bg-zinc-100/70 opacity-70"
              }`}
            >
              <div className="mb-1 flex items-center gap-3">
                <div className="flex-1 text-sm font-semibold text-anamaya-charcoal">
                  {c.name}
                </div>
                <VisibleToggle
                  testimonialId={testimonialId}
                  setSlug={c.slug}
                  defaultChecked={c.is_visible}
                />
              </div>
              {c.excerpt ? (
                <p className="text-sm leading-relaxed text-anamaya-charcoal/80">
                  &ldquo;{c.excerpt}&rdquo;
                </p>
              ) : (
                <p className="text-xs italic text-anamaya-charcoal/40">
                  No excerpt — falls back to the full review text on the site.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VisibleToggle({
  testimonialId,
  setSlug,
  defaultChecked,
}: {
  testimonialId: string;
  setSlug: string;
  defaultChecked: boolean;
}) {
  return (
    <form action={setAssignmentVisibilityFromForm}>
      <input type="hidden" name="testimonial_id" value={testimonialId} />
      <input type="hidden" name="set_slug" value={setSlug} />
      <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal ring-1 ring-zinc-200 hover:bg-zinc-50">
        <input
          type="checkbox"
          name="visible"
          defaultChecked={defaultChecked}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-4 w-4 accent-anamaya-green"
        />
        Visible
      </label>
    </form>
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
