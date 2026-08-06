import { getFaqKnowledge } from "@/lib/website-builder/settings";
import { getAOAIContext } from "@/lib/ao-ai-context";
import PageHeader from "../_components/PageHeader";
import { updateSettingsSection } from "../settings/actions";

/**
 * FAQ knowledge base. Everything saved here is fed to the AI when it drafts a
 * page/post's FAQs, so the questions and answers stay accurate and on-brand.
 * Stored as the "faq_knowledge" row in site_settings via updateSettingsSection.
 */

const labelCls = "block text-[13px] font-semibold text-[#1d2327]";
const hintCls = "mb-1 mt-0.5 text-[12px] text-[#50575e]";
const textareaCls =
  "block w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1.5 text-[13px] leading-relaxed focus:border-[#2271b1] focus:outline-none";

function Block({
  id,
  label,
  hint,
  value,
  rows,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <p className={hintCls}>{hint}</p>
      <textarea
        id={id}
        name={id}
        defaultValue={value}
        rows={rows}
        placeholder={placeholder}
        className={textareaCls}
      />
    </div>
  );
}

export default async function FaqKnowledgePage() {
  const [k, ao] = await Promise.all([getFaqKnowledge(), getAOAIContext()]);
  const guide = ao.guides[0] ?? null;
  const archetypes = (ao.archetypes ?? []).filter((a) => a.is_active !== false);
  const hasAo = !!guide || archetypes.length > 0;

  return (
    <div className="px-5 py-4">
      <PageHeader title="FAQs" />

      <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-[#50575e]">
        Everything below is reference for the AI that drafts FAQs on each page
        and post — it helps the questions and answers stay accurate and
        on-brand. Dump in as much useful material as you like. None of it is
        shown to visitors directly; only the FAQs you review and publish per
        page appear on the site.
      </p>

      {/* Brand voice + customer avatars, pulled live from AnamayOS and fed to
          the generator automatically. Read-only here. */}
      <div className="mb-6 max-w-3xl rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-[#1d2327]">
            From AnamayOS — used automatically
          </h2>
          <p className="mt-1 text-[12px] text-[#50575e]">
            Your brand voice and customer avatars are pulled live from AnamayOS
            and fed to the FAQ generator. Read-only here — edit them in AnamayOS.
          </p>
        </div>
        <div className="space-y-4 px-4 py-3 text-[13px] text-[#1d2327]">
          {!hasAo ? (
            <p className="text-[#50575e]">
              No AnamayOS brand data found
              {ao.error ? ` (${ao.error})` : ""}. The FAQ generator will fall
              back to the notes below.
            </p>
          ) : (
            <>
              {guide && (
                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                    Brand guide
                  </h3>
                  <p className="mt-1">
                    <strong>{guide.name}</strong>
                    {guide.voice_tone ? ` — ${guide.voice_tone}` : ""}
                  </p>
                  {guide.personality_traits?.length ? (
                    <p className="mt-0.5 text-[12px] text-[#50575e]">
                      Personality: {guide.personality_traits.join(", ")}
                    </p>
                  ) : null}
                </section>
              )}
              {archetypes.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                    Customer avatars ({archetypes.length})
                  </h3>
                  <ul className="mt-1 space-y-1">
                    {archetypes.map((a) => (
                      <li key={a.id}>
                        <strong>{a.name}</strong>
                        {a.description ? ` — ${a.description}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <form
        action={updateSettingsSection}
        className="max-w-3xl space-y-5 rounded-sm border border-[#c3c4c7] bg-white p-4"
      >
        <input type="hidden" name="section" value="faq_knowledge" />

        <Block
          id="customer_avatars"
          label="Customer avatars"
          hint="Who your guests are — their goals, worries, the questions they actually ask, and what matters to them. The AI phrases FAQs the way these people would."
          value={k.customer_avatars}
          rows={8}
          placeholder="e.g. Solo female traveler, 30s, first yoga retreat, worried about safety and going alone…"
        />

        <Block
          id="brand_vibe"
          label="Brand & vibe"
          hint="Voice, tone, and style the answers should match — warm, calm, premium, unpretentious, etc. Words to use and words to avoid."
          value={k.brand_vibe}
          rows={6}
          placeholder="e.g. Warm, grounded, welcoming. Speak like a friendly host, never salesy or corporate…"
        />

        <Block
          id="info"
          label="Info"
          hint="General facts, policies, logistics — anything the AI should treat as the source of truth (travel, what's included, cancellation, dietary, etc.). Accurate answers come from here."
          value={k.info}
          rows={12}
          placeholder="e.g. Getting here: fly to San José, then domestic flight to Tambor, then a 30-min taxi…"
        />

        <Block
          id="faq_content"
          label="FAQ content blocks"
          hint="Existing question/answer pairs to draw from. Group them by topic if you like — the AI picks and adapts the ones relevant to each page."
          value={k.faq_content}
          rows={14}
          placeholder={"Q: Is Anamaya good for beginners?\nA: Absolutely — our classes welcome all levels…\n\nQ: Do you offer airport pickup?\nA: …"}
        />

        <button
          type="submit"
          className="rounded-sm bg-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#135e96]"
        >
          Save
        </button>
      </form>
    </div>
  );
}
