"use client";

import { type ReactNode } from "react";
import { HeaderProvider, useHeader } from "@/contexts/HeaderContext";
import { ChromeProvider } from "@/contexts/ChromeContext";
import type { SSOUser } from "@/types/sso";

type Props = {
  children: ReactNode;
  user?: SSOUser | null;
};

/**
 * Thin client wrapper that provides cross-cutting React contexts to
 * the public site:
 *   - HeaderContext       (overVideo flag, set by hero blocks)
 *   - ChromeContext       (logged-in user, top-bar/menu open state)
 *
 * No chrome or footer is rendered here. Every UI block — top bar,
 * side menu, agent, footer — is a regular block that the page's own
 * template includes. AppShell just exposes the contexts those blocks
 * read when they need them.
 *
 * The only layout flourish kept is a top-padding offset on <main> so
 * a fixed-position top-bar block doesn't overlap the first row of
 * content. The offset disappears whenever a hero block has set
 * overVideo (the bar then floats transparent over the video).
 */
export default function AppShell({ children, user }: Props) {
  return (
    <HeaderProvider>
      <ChromeProvider user={user ?? null}>
        <MainWithOffset>{children}</MainWithOffset>
      </ChromeProvider>
    </HeaderProvider>
  );
}

function MainWithOffset({ children }: { children: ReactNode }) {
  const { overVideo } = useHeader();
  // Padding only when content is sitting BELOW a fixed top bar.
  // overVideo (set by cover-mode heroes) disables the offset so the
  // hero can fill the viewport.
  return <main className={`flex-1 ${overVideo ? "" : "pt-20"}`}>{children}</main>;
}
