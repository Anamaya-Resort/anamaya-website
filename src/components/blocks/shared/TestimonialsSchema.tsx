import type { Testimonial } from "@/lib/testimonials";

/**
 * Emits schema.org/Quotation JSON-LD for each testimonial in the
 * carousel. Deliberately uses Quotation rather than Review so the
 * markup is consumable by LLM crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, etc.) for evidence-based citation, while staying
 * outside the scope of Google's self-serving review-snippet rules.
 *
 * Every Quotation here MUST also be visible in the rendered HTML
 * on this page — server-rendered slides cover that, even when only
 * one slide is currently faded-in.
 */
export default function TestimonialsSchema({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  const ld = items.map((t) => {
    const text = t.excerpt && t.excerpt.trim() !== "" ? t.excerpt : t.review_text;
    const node: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Quotation",
      "@id": `#testimonial-${t.id}`,
      text,
      inLanguage: "en",
      about: {
        "@type": "LodgingBusiness",
        name: "Anamaya Resort & Retreat Center",
        url: "https://anamaya.com",
      },
    };

    if (t.title) {
      // Headline of the original review.
      (node as Record<string, unknown>).name = t.title;
    }

    if (t.review_url) {
      // Citation back to the original TripAdvisor review for verification.
      node.citation = {
        "@type": "CreativeWork",
        url: t.review_url,
        publisher: { "@type": "Organization", name: "TripAdvisor" },
      };
    }

    if (t.date_of_stay) {
      // Stay date as ISO when we can parse it (e.g. "March 2026" → 2026-03).
      const iso = monthYearToIso(t.date_of_stay);
      if (iso) node.datePublished = iso;
    }

    return node;
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

/** Convert "March 2026" / "Dec 2024" → ISO yyyy-MM-01. Returns null on miss. */
function monthYearToIso(s: string): string | null {
  const months: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };
  const m = s.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const mm = months[m[1]];
  if (!mm) return null;
  return `${m[2]}-${mm}-01`;
}
