import Link from "next/link";
import { FOOTER_LAYOUT, SOCIAL_LINKS, type FooterGroup } from "@/data/nav";
import { SOCIAL_ICON_MAP } from "./SocialIcons";

// Matches v2 footer exactly:
//   - bg #444444 (anamaya-charcoal)
//   - headings color #8F993E (anamaya-olive), with a thin line under each
//   - link color #b8d3cf (anamaya-mint)
//   - 4 columns: Experience / Travel+Cookbook / Company+Social / Newsletter
//   - bottom row: copyright + Terms | Privacy | credit line

const FOOTER_NEWSLETTER_SRC =
  "https://link.sereenly.com/widget/form/KStRA3wdDq5FUO6ah5Xe";

const currentYear = new Date().getFullYear();

function FooterGroupBlock({ group }: { group: FooterGroup }) {
  return (
    <div className="mb-8 last:mb-0">
      <h3 className="text-base font-semibold tracking-wide text-anamaya-olive">
        {group.heading}
      </h3>
      <div className="mt-2 mb-4 h-px w-full bg-white/15" />
      <ul className="space-y-1.5 text-sm">
        {group.items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href ?? "#"}
              className="text-anamaya-mint transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-anamaya-charcoal text-anamaya-mint">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — The Experience */}
          <div>
            {FOOTER_LAYOUT.col1.map((g) => (
              <FooterGroupBlock key={g.heading} group={g} />
            ))}
          </div>

          {/* Column 2 — The Travel + The Cookbook */}
          <div>
            {FOOTER_LAYOUT.col2.map((g) => (
              <FooterGroupBlock key={g.heading} group={g} />
            ))}
          </div>

          {/* Column 3 — The Company + On social */}
          <div>
            {FOOTER_LAYOUT.col3.map((g) => (
              <FooterGroupBlock key={g.heading} group={g} />
            ))}

            <div className="mb-8 last:mb-0">
              <h3 className="text-base font-semibold tracking-wide text-anamaya-olive">
                On social
              </h3>
              <div className="mt-2 mb-4 h-px w-full bg-white/15" />
              <ul className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map((s) => {
                  const Icon = SOCIAL_ICON_MAP[s.label];
                  return (
                    <li key={s.label}>
                      <Link
                        href={s.href}
                        aria-label={s.label}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-anamaya-mint/20 text-anamaya-mint transition-colors hover:bg-anamaya-mint hover:text-anamaya-charcoal"
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : s.label.slice(0, 2)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Column 4 — Newsletter */}
          <div>
            <h3 className="text-base font-semibold tracking-wide text-anamaya-olive">
              Receive our newsletter
            </h3>
            <div className="mt-2 mb-4 h-px w-full bg-white/15" />
            <div className="overflow-hidden rounded-sm bg-white">
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

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-anamaya-mint/80">
          <p>
            Copyright © {currentYear} Anamaya Resort and Retreat Center | All
            Rights Reserved.
          </p>
          <p className="mt-2">
            <Link
              href="/terms-service-anamaya-website/"
              className="hover:text-white"
            >
              Terms of Use
            </Link>{" "}
            |{" "}
            <Link
              href="/terms-service-anamaya-website/"
              className="hover:text-white"
            >
              Privacy Policy
            </Link>{" "}
            | Site designed by{" "}
            <a
              href="https://justbucreative.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              JUSTBU Creative, LLC | Laurie Baines
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
