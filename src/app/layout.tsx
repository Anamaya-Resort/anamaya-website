import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anamaya Resort",
  description:
    "Wellness retreats and yoga teacher trainings on a clifftop in Montezuma, Costa Rica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* LCP image on the homepage — preload so it starts loading while the
            HTML is still being parsed (~500 ms shaved off LCP). */}
        <link
          rel="preload"
          as="image"
          href="/yoga_retreat_costarica.webp"
          fetchPriority="high"
        />
        {/* DNS + TLS warm-up for origins we may hit after first paint.
            Font is self-hosted by Next, so fonts.gstatic.com is NOT preconnected. */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://link.sereenly.com" />
        <link rel="dns-prefetch" href="https://link.msgsndr.com" />
      </head>
      <body className="min-h-full bg-white text-anamaya-charcoal font-sans">
        {children}
      </body>
    </html>
  );
}
