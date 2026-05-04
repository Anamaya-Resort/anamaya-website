"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteTestimonialFromForm } from "./actions";

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
 * on the far left (left of the review #). Clicking the chevron opens
 * a detail panel beneath the row showing every field. Only one row
 * can be open at a time — opening another auto-closes the previous.
 */
export default function TestimonialsList({ items }: { items: ListRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Track which Tailwind grid classes match the header. Single source
  // of truth so header + rows stay aligned.
  const cols =
    "grid grid-cols-[28px_56px_1fr_160px_180px_60px_70px_140px] items-center gap-2";

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
      <div className={`${cols} bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60`}>
        <div />
        <div>#</div>
        <div>Title</div>
        <div>Reviewer</div>
        <div>Date / Trip</div>
        <div>Rating</div>
        <div>Pub</div>
        <div className="text-right" />
      </div>

      <div className="divide-y divide-zinc-100">
        {items.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id}>
              <div className={`${cols} px-4 py-3 text-sm transition-colors ${
                open ? "bg-anamaya-mint/15" : "hover:bg-zinc-50/60"
              }`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? "Collapse details" : "Expand details"}
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="flex h-7 w-7 items-center justify-center rounded text-anamaya-charcoal/60 hover:bg-anamaya-mint/30 hover:text-anamaya-green"
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
                <div>{t.rating}/5</div>
                <div>{t.published ? "Yes" : "—"}</div>
                <div className="flex items-center justify-end gap-3 text-right">
                  <Link
                    href={`/admin/testimonials/${t.id}`}
                    className="text-anamaya-green hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={deleteTestimonialFromForm} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {open && <DetailPanel t={t} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({ t }: { t: ListRow }) {
  return (
    <div className="border-t border-anamaya-mint/40 bg-anamaya-mint/10 px-6 py-5 text-sm">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Review #" value={t.review_number ?? "—"} />
        <Field label="Review ID" value={t.review_id} mono />
        <Field label="Reviewer" value={t.author ?? "—"} />
        <Field
          label="Rating"
          value={`${t.rating} / 5`}
        />
        <Field label="Date of stay" value={t.date_of_stay ?? "—"} />
        <Field label="Trip type" value={t.trip_type ?? "—"} />
        <Field
          label="Published"
          value={t.published ? "Yes" : "Unpublished"}
        />
        {t.updated_at && (
          <Field
            label="Last updated"
            value={new Date(t.updated_at).toLocaleString()}
          />
        )}
      </div>

      {t.title && (
        <div className="mb-3">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
            Title
          </span>
          <div className="text-base font-semibold text-anamaya-charcoal">
            {t.title}
          </div>
        </div>
      )}

      <div className="mb-3">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          Review text
        </span>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-anamaya-charcoal/85">
          {t.review_text}
        </p>
      </div>

      {t.review_url && (
        <div className="mb-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
            Review URL
          </span>
          <a
            href={t.review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-xs text-anamaya-green hover:underline"
          >
            {t.review_url}
          </a>
        </div>
      )}

      <div className="mt-4">
        <Link
          href={`/admin/testimonials/${t.id}`}
          className="rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
        >
          Edit this review
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
        {label}
      </span>
      <div
        className={`text-sm text-anamaya-charcoal ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
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
