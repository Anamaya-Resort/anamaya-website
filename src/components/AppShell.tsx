"use client";

import { type ReactNode } from "react";
import { HeaderProvider, useHeader } from "@/contexts/HeaderContext";
import { ChromeProvider } from "@/contexts/ChromeContext";
import Footer from "./Footer";
import type { SSOUser } from "@/types/sso";

type Props = {
  children: ReactNode;
  user?: SSOUser | null;
  /**
   * Site-chrome overlays rendered above {children}. The server layout
   * mounts <TemplateRenderer templateSlug="site_chrome" /> and passes
   * the rendered tree in via this prop. Pages can opt out by passing
   * `chrome={null}` (e.g. landing pages with no top bar).
   */
  chrome?: ReactNode;
};

export default function AppShell({ children, user, chrome }: Props) {
  return (
    <HeaderProvider>
      <ChromeProvider user={user ?? null}>
        {chrome}
        <MainWithOffset hasTopBar={chrome != null}>{children}</MainWithOffset>
        <Footer />
      </ChromeProvider>
    </HeaderProvider>
  );
}

function MainWithOffset({
  children,
  hasTopBar,
}: {
  children: ReactNode;
  hasTopBar: boolean;
}) {
  const { overVideo } = useHeader();
  // Push content below the fixed top bar except when a hero video is
  // sitting under it (the bar floats over the video). When the chrome
  // is omitted entirely, no offset either.
  const needsOffset = hasTopBar && !overVideo;
  return (
    <main className={`flex-1 ${needsOffset ? "pt-20" : ""}`}>{children}</main>
  );
}
