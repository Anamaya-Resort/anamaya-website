import type { NewsletterContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/** Newsletter signup on a branded background. */
export default function NewsletterBlock({ content }: { content: NewsletterContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const pad = content?.padding_y_px ?? 48;
  const headingFontClass = content?.heading_font === "body" ? "font-sans" : "font-heading";
  const submitBg = resolveBrandColor(content?.submit_color) ?? "#A35B4E";

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, paddingTop: pad, paddingBottom: pad }}
    >
      <div className="mx-auto w-full max-w-[720px] px-6 text-center">
        {content?.heading && (
          <h2
            className={`${headingFontClass} mb-3`}
            style={{
              fontSize: content?.heading_size_px ?? 28,
              color: resolveBrandColor(content?.heading_color) ?? undefined,
            }}
          >
            {content.heading}
          </h2>
        )}
        {content?.description && (
          <p
            className="mb-6"
            style={{
              fontSize: content?.description_size_px ?? 16,
              color: resolveBrandColor(content?.description_color) ?? undefined,
            }}
          >
            {content.description}
          </p>
        )}
        <form
          method="post"
          action={content?.form_action_url || "#"}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <input
            type="email"
            name="email"
            required
            placeholder={content?.input_placeholder ?? "your@email.com"}
            className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
          <button
            type="submit"
            className="rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:opacity-90"
            style={{ backgroundColor: submitBg }}
          >
            {content?.submit_label ?? "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}
