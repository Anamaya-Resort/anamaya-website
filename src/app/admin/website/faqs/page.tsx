import { getFaqKnowledge } from "@/lib/website-builder/settings";
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
  const k = await getFaqKnowledge();

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
