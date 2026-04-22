import Link from "next/link";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@/data/nav";
import { SOCIAL_ICON_MAP } from "./SocialIcons";

const currentYear = new Date().getFullYear();

// Same Sereenly form provider as the inline homepage block, but a different
// form id for the footer (matches v2 so submissions land in the right list).
const FOOTER_NEWSLETTER_SRC =
  "https://link.sereenly.com/widget/form/KStRA3wdDq5FUO6ah5Xe";

export default function Footer() {
  return (
    <footer className="bg-anamaya-charcoal text-zinc-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <h3 className="mb-3 text-lg font-semibold tracking-wide text-anamaya-olive">
              Anamaya Resort
            </h3>
            <p className="text-sm leading-6 text-zinc-400">
              Wellness retreats and yoga teacher trainings on a clifftop in
              Montezuma, Costa Rica.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((s) => {
                const Icon = SOCIAL_ICON_MAP[s.label];
                return (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      aria-label={s.label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-200 transition-colors hover:bg-anamaya-green hover:text-white"
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : s.label.slice(0, 2)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-lg font-semibold tracking-wide text-anamaya-olive">
                {col.heading}
              </h3>
              <ul className="space-y-2 text-sm">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href ?? "#"}
                      className="transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter signup (v2 footer form id: KStRA3wdDq5FUO6ah5Xe) */}
          <div>
            <h3 className="mb-3 text-lg font-semibold tracking-wide text-anamaya-olive">
              Receive our newsletter
            </h3>
            <div className="overflow-hidden rounded-md bg-white">
              <iframe
                title="Anamaya Newsletter Footer Signup"
                src={FOOTER_NEWSLETTER_SRC}
                className="h-[300px] w-full border-0"
                loading="lazy"
                allow="autoplay; encrypted-media; gyroscope;"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <p>© {currentYear} Anamaya Resort. All rights reserved.</p>
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link href="/terms-service-anamaya-website/" className="hover:text-white">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link href="/terms-service-anamaya-website/" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
