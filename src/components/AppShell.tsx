"use client";

import { type ReactNode } from "react";
import { HeaderProvider, useHeader } from "@/contexts/HeaderContext";
import Header from "./Header";
import Footer from "./Footer";
import type { SSOUser } from "@/types/sso";

type Props = {
  children: ReactNode;
  user?: SSOUser | null;
};

export default function AppShell({ children, user }: Props) {
  return (
    <HeaderProvider>
      <Header user={user ?? null} />
      <MainWithOffset>{children}</MainWithOffset>
      <Footer />
    </HeaderProvider>
  );
}

function MainWithOffset({ children }: { children: ReactNode }) {
  const { overVideo } = useHeader();
  return (
    <main className={`flex-1 ${overVideo ? "" : "pt-20"}`}>{children}</main>
  );
}
