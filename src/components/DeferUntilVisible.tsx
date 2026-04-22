"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** Content to render once the wrapper scrolls near the viewport. */
  children: ReactNode;
  /** Placeholder to render before intersection (reserves space). */
  fallback?: ReactNode;
  /** IntersectionObserver rootMargin (default: 200px below viewport). */
  rootMargin?: string;
  /** Min-height for the wrapper so the page doesn't jump on swap. */
  minHeight?: number | string;
  className?: string;
};

/**
 * Defers rendering of expensive children (iframes, third-party scripts) until
 * the user scrolls near the component. Keeps the critical-path light without
 * needing a click.
 */
export default function DeferUntilVisible({
  children,
  fallback = null,
  rootMargin = "200px",
  minHeight,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    // If IntersectionObserver isn't available, render immediately.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={minHeight ? { minHeight } : undefined}
    >
      {visible ? children : fallback}
    </div>
  );
}
