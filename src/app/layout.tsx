import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Restrict to the weights actually used in the codebase:
// 400 default, 500 font-medium, 600 font-semibold. Dropping the other six
// weights shaves ~200 KB of font payload.
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

// Root layout is intentionally thin — just html/body/fonts.
// The site chrome (Header, Footer, SideMenu) lives in (site)/layout.tsx
// so /auth and /admin routes can opt out of it.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-anamaya-charcoal font-sans">
        {children}
      </body>
    </html>
  );
}
