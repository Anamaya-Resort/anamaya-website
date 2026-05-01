"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { SSOUser } from "@/types/sso";

/**
 * Shared state for site-chrome overlay blocks (UiTopBlock, UiSideMenuRightBlock,
 * future UiAgent). The top bar's "MENU" button toggles `menuOpen` and the
 * right-side menu drawer reads it. Both blocks read `user` here instead of
 * accepting it as a prop, since they're rendered by a server-side
 * TemplateRenderer and can't be threaded user data through props.
 */
type ChromeCtx = {
  user: SSOUser | null;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

const Ctx = createContext<ChromeCtx | null>(null);

export function ChromeProvider({
  user,
  children,
}: {
  user: SSOUser | null;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpenState] = useState(false);
  const setMenuOpen = useCallback((v: boolean) => setMenuOpenState(v), []);
  return (
    <Ctx.Provider value={{ user, menuOpen, setMenuOpen }}>{children}</Ctx.Provider>
  );
}

export function useChrome(): ChromeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChrome must be used inside ChromeProvider");
  return c;
}

/** Returns the chrome context if mounted, else null. Use from blocks
 *  rendered outside the public-site tree (admin LivePreview, isolated
 *  block-preview iframes) so they don't throw when no chrome is present. */
export function useChromeOptional(): ChromeCtx | null {
  return useContext(Ctx);
}
