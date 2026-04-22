"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type HeaderState = {
  /** True when the page has a hero section behind the header that needs transparent styling. */
  overVideo: boolean;
};

type HeaderCtx = HeaderState & {
  setOverVideo: (v: boolean) => void;
};

const Ctx = createContext<HeaderCtx | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [overVideo, setOverVideoState] = useState(false);
  const setOverVideo = useCallback((v: boolean) => setOverVideoState(v), []);
  return (
    <Ctx.Provider value={{ overVideo, setOverVideo }}>{children}</Ctx.Provider>
  );
}

export function useHeader(): HeaderCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useHeader must be used inside HeaderProvider");
  return c;
}

/**
 * Returns the HeaderContext if a HeaderProvider is mounted, else null.
 * Use this from components rendered in multiple trees (e.g. a block
 * renderer shown both on the public site AND in the /admin preview)
 * so it doesn't throw when the provider is absent.
 */
export function useHeaderOptional(): HeaderCtx | null {
  return useContext(Ctx);
}
