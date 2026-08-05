"use client";

import { useEffect } from "react";
import { useHeaderOptional } from "@/contexts/HeaderContext";

/**
 * Tiny client bridge: tells the site header to switch to its dark /
 * transparent "over-hero" look while the spa page is mounted, then
 * reverts on unmount. UiTopBlock still reverts to white after the user
 * scrolls past the hero (its own scroll handler) — this only controls
 * the initial dark-over-photo state. No-op in the admin preview where
 * no HeaderProvider is mounted.
 */
export default function SpaOverVideo() {
  const header = useHeaderOptional();
  useEffect(() => {
    if (!header) return;
    header.setOverVideo(true);
    return () => header.setOverVideo(false);
  }, [header]);
  return null;
}
