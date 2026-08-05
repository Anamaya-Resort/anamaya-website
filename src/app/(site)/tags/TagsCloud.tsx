"use client";

import { useEffect } from "react";

// Brand palette the cloud cycles through. Kept as a const (mirrors the
// approved mockup) — same hexes as the site theme tokens, but the animation
// needs raw values to assign inline colours per tag.
const DEFAULT_PALETTE = [
  "#97c03b",
  "#7ca32b",
  "#54afaa",
  "#7aa59e",
  "#ae564b",
  "#8f993e",
  "#636a26",
  "#b8d3cf",
];

// Per-tag animation state we stash on the DOM node.
type CTag = HTMLElement & {
  _aw?: number;
  _aA?: number;
  _ap?: number;
  _rw?: number;
  _rA?: number;
  _rp?: number;
  _sw?: number;
  _sA?: number;
  _sp?: number;
  _dx?: number;
  _dy?: number;
  _r?: number;
  _a0?: number;
  _ct?: ReturnType<typeof setTimeout>;
  _onClick?: (e: Event) => void;
};

/**
 * Behaviour controller for the /tags page. Renders nothing — it drives the
 * server-rendered `.ctag` spans inside `.cloud` (a swirling spiral of tags)
 * and wires the two sort capsules. Ported from the approved mockup's JS.
 */
export default function TagsCloud({
  palette = DEFAULT_PALETTE,
}: {
  palette?: string[];
}) {
  useEffect(() => {
    const PALETTE = palette.length ? palette : DEFAULT_PALETTE;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

    const cloud = document.querySelector<HTMLElement>(".cloud");
    const tags = Array.prototype.slice.call(
      document.querySelectorAll<HTMLElement>(".ctag"),
    ) as CTag[];

    let GZ = 10;
    const VDAMP = 0.5; // damp vertical travel so the swirl stays contained
    let rafId = 0;
    let t0: number | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    // ---- seed per-tag motion + click-to-jump (always wire the click) ----
    tags.forEach((el) => {
      el._aw = ((2 * Math.PI) / rnd(26, 52)) * (Math.random() < 0.5 ? -1 : 1); // angular sway speed
      el._aA = rnd(0.07, 0.17); // angular sway amplitude (rad)
      el._ap = rnd(0, Math.PI * 2);
      el._rw = (2 * Math.PI) / rnd(15, 30); // radial breathing speed (spiral in/out)
      el._rA = rnd(0.04, 0.08); // radial breathing amplitude
      el._rp = rnd(0, Math.PI * 2);
      el._sw = (2 * Math.PI) / rnd(8, 12); // scale speed (8-12s cycle)
      el._sA = rnd(0.05, 0.12); // scale amplitude (+-5-12%)
      el._sp = rnd(0, Math.PI * 2);
      el.style.color = pick(PALETTE);
      const onClick = () => {
        const slug = el.getAttribute("data-slug");
        const t = slug ? document.getElementById("tag-" + slug) : null;
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      el._onClick = onClick;
      el.addEventListener("click", onClick);
    });

    // ---- measure each tag relative to the cloud centre ----
    function measure() {
      if (!cloud) return;
      tags.forEach((el) => {
        el.style.transform = "none";
      });
      const cb = cloud.getBoundingClientRect();
      const cx = cb.left + cb.width / 2;
      const cy = cb.top + cb.height / 2;
      tags.forEach((el) => {
        const r = el.getBoundingClientRect();
        el._dx = r.left + r.width / 2 - cx;
        el._dy = r.top + r.height / 2 - cy;
        el._r = Math.max(
          1,
          Math.sqrt((el._dx ?? 0) * (el._dx ?? 0) + (el._dy ?? 0) * (el._dy ?? 0)),
        );
        el._a0 = Math.atan2(el._dy ?? 0, el._dx ?? 0);
      });
    }

    // ---- per-tag colour cycle every 8-12s; bump z-index on change ----
    function colorCycle(el: CTag) {
      el.style.color = pick(PALETTE);
      el.style.zIndex = String(++GZ); // whoever just changed rises to the top
      el._ct = setTimeout(() => colorCycle(el), rnd(8, 12) * 1000);
    }

    // ---- spiral animation loop ----
    function frame(now: number) {
      if (t0 === null) t0 = now;
      const t = (now - t0) / 1000;
      for (let i = 0; i < tags.length; i++) {
        const el = tags[i];
        const ang = (el._a0 ?? 0) + (el._aA ?? 0) * Math.sin(t * (el._aw ?? 0) + (el._ap ?? 0)); // arc around centre
        const r = (el._r ?? 0) * (1 + (el._rA ?? 0) * Math.sin(t * (el._rw ?? 0) + (el._rp ?? 0))); // breathe in/out
        const tx = Math.cos(ang) * r - (el._dx ?? 0);
        const ty = (Math.sin(ang) * r - (el._dy ?? 0)) * VDAMP;
        const s = 1 + (el._sA ?? 0) * Math.sin(t * (el._sw ?? 0) + (el._sp ?? 0)); // slow grow/shrink
        el.style.transform =
          "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
      }
      rafId = requestAnimationFrame(frame);
    }

    let onResize: (() => void) | undefined;
    if (!reduce && cloud && tags.length) {
      measure();
      rafId = requestAnimationFrame(frame);
      tags.forEach((el) => {
        el._ct = setTimeout(() => colorCycle(el), rnd(0, 4000));
      });
      onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measure, 200);
      };
      window.addEventListener("resize", onResize);
    }

    // ---- sort capsules ----
    function setSort(mode: "pop" | "alpha") {
      const box = document.getElementById("tsections");
      if (!box) return;
      const secs = Array.prototype.slice.call(box.children) as HTMLElement[];
      secs.sort((a, b) => {
        const an = a.dataset.name ?? "";
        const bn = b.dataset.name ?? "";
        if (mode === "pop") {
          const d = Number(b.dataset.count) - Number(a.dataset.count);
          return d || an.localeCompare(bn);
        }
        return an.localeCompare(bn);
      });
      secs.forEach((s) => box.appendChild(s));
      document.getElementById("cap-pop")?.classList.toggle("on", mode === "pop");
      document.getElementById("cap-alpha")?.classList.toggle("on", mode === "alpha");
    }
    const capPop = document.getElementById("cap-pop");
    const capAlpha = document.getElementById("cap-alpha");
    const onPop = () => setSort("pop");
    const onAlpha = () => setSort("alpha");
    capPop?.addEventListener("click", onPop);
    capAlpha?.addEventListener("click", onAlpha);

    // ---- cleanup ----
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (onResize) window.removeEventListener("resize", onResize);
      tags.forEach((el) => {
        if (el._ct) clearTimeout(el._ct);
        if (el._onClick) el.removeEventListener("click", el._onClick);
        el.style.transform = "";
      });
      capPop?.removeEventListener("click", onPop);
      capAlpha?.removeEventListener("click", onAlpha);
    };
  }, [palette]);

  return null;
}
