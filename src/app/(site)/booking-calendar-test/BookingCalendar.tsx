"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarData, CalRetreat, CalWeek } from "./data";

/**
 * Interactive booking calendar (client). Left: a 2:3 "tower" that shows the
 * month/year context by default and a retreat's details when one is picked,
 * over a faint washed-out backdrop of whichever retreat is centred on the
 * right (crossfading as you scroll). Right: a continuous Sat-to-Sat week grid
 * that fades at the top/bottom so the centre weeks draw the eye. On a phone
 * the tower is hidden and picking a retreat slides up a detail sheet. Booking
 * links out to Retreat Guru.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtRange(startISO: string, endISO: string): string {
  const s = new Date(`${startISO}T12:00:00Z`);
  const e = new Date(`${endISO}T12:00:00Z`);
  const sm = MONTHS_SHORT[s.getUTCMonth()];
  const em = MONTHS_SHORT[e.getUTCMonth()];
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  return sameMonth
    ? `${sm} ${s.getUTCDate()} – ${e.getUTCDate()}, ${e.getUTCFullYear()}`
    : `${sm} ${s.getUTCDate()} – ${em} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

function priceLabel(r: CalRetreat): string | null {
  if (r.priceFrom == null) return null;
  const n = r.priceFrom.toLocaleString("en-US");
  return `from ${r.currency === "USD" ? "$" : ""}${n}${r.currency !== "USD" ? " " + r.currency : ""}`;
}

function spotsLabel(r: CalRetreat): string | null {
  if (r.isSoldOut) return r.waitlist ? "Waitlist open" : "Sold out";
  if (r.availableSpaces == null) return null;
  if (r.availableSpaces <= 0) return r.waitlist ? "Waitlist open" : "Sold out";
  return `${r.availableSpaces} ${r.availableSpaces === 1 ? "spot" : "spots"} left`;
}

export default function BookingCalendar({ data }: { data: CalendarData }) {
  const { retreats, weeks } = data;
  const byId = useMemo(() => new Map(retreats.map((r) => [r.id, r])), [retreats]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [monthLabel, setMonthLabel] = useState(weeks[0]?.monthLabel ?? "");
  // Two crossfading backdrop slots; `active` says which one is shown.
  const [bgSlots, setBgSlots] = useState<{ a: string | null; b: string | null; active: "a" | "b" }>(
    { a: null, b: null, active: "a" },
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // Push a new backdrop image into the idle slot and flip to it (crossfade).
  const setBg = useCallback((url: string | null) => {
    if (!url) return;
    setBgSlots((prev) => {
      const cur = prev.active === "a" ? prev.a : prev.b;
      if (url === cur) return prev;
      return prev.active === "a"
        ? { a: prev.a, b: url, active: "b" }
        : { a: url, b: prev.b, active: "a" };
    });
  }, []);

  // On scroll: update the tower's month label AND the washed backdrop to the
  // retreat image nearest the vertical centre of the grid.
  const updateFocus = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const mid = el.getBoundingClientRect().top + el.clientHeight / 2;

    let bestLabel = "";
    let bestDist = Infinity;
    el.querySelectorAll<HTMLElement>("[data-week-label]").forEach((row) => {
      const rect = row.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = row.dataset.weekLabel ?? "";
      }
    });
    if (bestLabel) setMonthLabel(bestLabel);

    let bestImg: string | null = null;
    let bestImgDist = Infinity;
    el.querySelectorAll<HTMLElement>("[data-bg-image]").forEach((row) => {
      const rect = row.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (dist < bestImgDist) {
        bestImgDist = dist;
        bestImg = row.dataset.bgImage ?? null;
      }
    });
    setBg(bestImg);
  }, [setBg]);

  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateFocus();
    });
  }, [updateFocus]);

  useEffect(() => {
    updateFocus();
  }, [updateFocus]);

  if (!weeks.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-anamaya-charcoal/60">
        <p className="italic">
          No upcoming retreats to show yet. They appear here automatically once
          they&rsquo;re public and confirmed in AnamayaOS.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[90%] max-w-[1600px] px-2 sm:px-4">
      <div className="flex gap-10">
        {/* LEFT — tower (desktop only). Sticky so it stays as the grid scrolls. */}
        <aside className="hidden md:block md:w-[380px] lg:w-[460px] shrink-0">
          <div className="sticky top-24">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-anamaya-mint/50 bg-anamaya-cream/70 shadow-sm">
              {/* Washed-out backdrop of the retreat centred on the right,
                  crossfading as you scroll. 25% opacity at top → 5% at bottom. */}
              {[
                { slot: "a" as const, url: bgSlots.a },
                { slot: "b" as const, url: bgSlots.b },
              ].map(({ slot, url }) =>
                url ? (
                  <div
                    key={slot}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
                    style={{ opacity: bgSlots.active === slot ? 1 : 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        maskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.05))",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.05))",
                        filter: "saturate(0.9)",
                      }}
                    />
                  </div>
                ) : null,
              )}

              <div className="relative z-10 h-full w-full">
                {selected ? (
                  <TowerDetail r={selected} onClose={() => setSelectedId(null)} />
                ) : (
                  <TowerContext monthLabel={monthLabel} />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — the scrolling Sat-to-Sat grid, faded at top & bottom. */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="relative h-[80vh] flex-1 overflow-y-auto pr-1"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 88%, transparent 100%)",
          }}
        >
          <div className="flex flex-col gap-3 pt-[7vh] pb-[20vh]">
            {weeks.map((w) => (
              <WeekRow
                key={w.key}
                week={w}
                byId={byId}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE — detail sheet slides up when a retreat is tapped. */}
      {selected && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-anamaya-charcoal/40"
            onClick={() => setSelectedId(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-anamaya-cream p-5 pb-8 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-anamaya-charcoal/20" />
            <TowerDetail r={selected} onClose={() => setSelectedId(null)} embedded />
          </div>
        </div>
      )}
    </div>
  );
}

/** Default tower face: the month/year context, updating as the grid scrolls. */
function TowerContext({ monthLabel }: { monthLabel: string }) {
  const [month, year] = monthLabel.split(" ");
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-anamaya-green">
        Upcoming Retreats
      </p>
      <h2 className="mt-6 font-heading text-6xl font-semibold leading-none text-anamaya-charcoal">
        {month}
      </h2>
      <p className="mt-3 font-heading text-3xl text-anamaya-charcoal/50">{year}</p>
      <p className="mt-8 max-w-[22ch] text-base italic text-anamaya-charcoal/60">
        Scroll the calendar, then tap any retreat to see its details here.
      </p>
    </div>
  );
}

/** Tower / sheet face: a single retreat's details + a Book button (→ RG). */
function TowerDetail({
  r,
  onClose,
  embedded,
}: {
  r: CalRetreat;
  onClose: () => void;
  embedded?: boolean;
}) {
  const spots = spotsLabel(r);
  const price = priceLabel(r);
  return (
    <div className={embedded ? "" : "flex h-full w-full flex-col overflow-y-auto"}>
      <div className="relative">
        {r.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.image}
            alt={r.title}
            className={`w-full object-cover ${embedded ? "h-44 rounded-2xl" : "h-56"}`}
          />
        ) : (
          <div className={`w-full bg-anamaya-mint/30 ${embedded ? "h-28 rounded-2xl" : "h-40"}`} />
        )}
        {!embedded && (
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-anamaya-charcoal shadow hover:bg-white"
          >
            ×
          </button>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${embedded ? "pt-4" : "p-5"}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-anamaya-green">
          {fmtRange(r.startISO, r.endISO)}
        </p>
        <h3 className="mt-1 font-heading text-2xl font-semibold leading-tight text-anamaya-charcoal">
          {r.title}
        </h3>
        {r.teacher && <p className="mt-0.5 text-base text-anamaya-charcoal/70">with {r.teacher}</p>}

        {(spots || price) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {price && (
              <span className="rounded-full bg-anamaya-green/10 px-3 py-1 text-sm font-semibold text-anamaya-green">
                {price}
              </span>
            )}
            {spots && (
              <span className="rounded-full bg-anamaya-charcoal/5 px-3 py-1 text-sm font-semibold text-anamaya-charcoal/70">
                {spots}
              </span>
            )}
          </div>
        )}

        {r.blurb && (
          <p className="mt-3 line-clamp-5 text-base leading-relaxed text-anamaya-charcoal/80">
            {r.blurb}
          </p>
        )}

        {r.infoHref && (
          <a
            href={r.infoHref}
            className="mt-3 inline-block self-start rounded-full border border-anamaya-green px-5 py-2 text-sm font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:bg-anamaya-green hover:text-white"
          >
            More Info
          </a>
        )}

        <div className="mt-auto pt-5">
          {r.bookHref ? (
            <a
              href={r.bookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-full bg-anamaya-green px-5 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
            >
              {r.isSoldOut && r.waitlist ? "Join Waitlist" : "Book Now"}
            </a>
          ) : (
            <span className="block rounded-full bg-anamaya-charcoal/10 px-5 py-3 text-center text-sm italic text-anamaya-charcoal/50">
              Booking link coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** One Saturday-to-Saturday week: an 8-cell date ruler + any retreat bars. */
function WeekRow({
  week,
  byId,
  selectedId,
  onSelect,
}: {
  week: CalWeek;
  byId: Map<string, CalRetreat>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const items = week.retreatIds.map((id) => byId.get(id)).filter(Boolean) as CalRetreat[];
  // First retreat image in this week — feeds the tower's washed backdrop.
  const bgImage = items.find((r) => r.image)?.image ?? undefined;
  return (
    <div data-week-label={week.monthLabel} data-bg-image={bgImage}>
      {week.startsNewMonth && (
        <div className="mb-1.5 mt-6 flex items-center gap-3 first:mt-0">
          <span className="font-heading text-2xl font-semibold tracking-wide text-anamaya-green">
            {week.monthLabel}
          </span>
          <span className="h-px flex-1 bg-anamaya-mint/50" />
        </div>
      )}

      <div
        className={`rounded-xl border p-3 transition-colors ${
          items.length
            ? "border-anamaya-mint/60 bg-white/50"
            : "border-transparent bg-anamaya-charcoal/[0.02]"
        }`}
      >
        {/* 8-cell date ruler (Sat .. Sat). */}
        <div className="grid grid-cols-8 gap-1.5">
          {week.days.map((d, i) => {
            const isSat = i === 0 || i === 7;
            return (
              <div
                key={d.iso}
                className={`flex flex-col items-center rounded-md py-0.5 leading-none ${
                  isSat ? "bg-anamaya-mint/25" : ""
                }`}
              >
                <span className="text-[10px] uppercase leading-none text-anamaya-charcoal/40">
                  {d.dayLetter}
                </span>
                <span
                  className={`mt-0.5 text-sm leading-none ${
                    items.length ? "text-anamaya-charcoal/80" : "text-anamaya-charcoal/35"
                  }`}
                >
                  {d.dayNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Retreat bar(s) for this week — repeated in each week they span. */}
        {items.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {items.map((r) => {
              const spots = spotsLabel(r);
              const price = priceLabel(r);
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-all ${
                    active
                      ? "bg-anamaya-green text-white shadow"
                      : "bg-anamaya-cream hover:bg-anamaya-mint/30"
                  } ${r.isSoldOut ? "opacity-70" : ""}`}
                >
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image}
                      alt=""
                      className="h-[72px] w-[108px] shrink-0 rounded-md object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold leading-tight">
                      {r.title}
                    </span>
                    <span
                      className={`block truncate text-sm ${
                        active ? "text-white/80" : "text-anamaya-charcoal/55"
                      }`}
                    >
                      {r.teacher ? `with ${r.teacher}` : fmtRange(r.startISO, r.endISO)}
                    </span>
                  </span>
                  {(price || spots) && (
                    <span
                      className={`hidden shrink-0 text-right text-xs font-semibold sm:block ${
                        active ? "text-white" : "text-anamaya-green"
                      }`}
                    >
                      {price ?? spots}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
