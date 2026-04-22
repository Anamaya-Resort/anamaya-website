"use client";

import { type ReactNode } from "react";
import { HeaderProvider, useHeader } from "@/contexts/HeaderContext";
import Header from "./Header";
import Footer from "./Footer";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <HeaderProvider>
      <Header />
      <MainWithOffset>{children}</MainWithOffset>
      <Footer />
    </HeaderProvider>
  );
}

// On pages WITHOUT a hero video, content starts at y=0 — behind the fixed header.
// Apply top padding equal to header height (h-20 → 5rem) to push content below it.
// On hero-video pages, the hero itself sits under the header; no padding needed.
function MainWithOffset({ children }: { children: ReactNode }) {
  const { overVideo } = useHeader();
  return (
    <main className={`flex-1 ${overVideo ? "" : "pt-20"}`}>{children}</main>
  );
}
