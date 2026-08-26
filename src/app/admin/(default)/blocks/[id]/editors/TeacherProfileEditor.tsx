"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { TeacherProfileContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: TeacherProfileContent | null | undefined): TeacherProfileContent {
  return {
    ao_person_id: c?.ao_person_id ?? "",
    name: c?.name ?? "",
    credentials: c?.credentials ?? "",
    photo_url: c?.photo_url ?? "",
    banner_url: c?.banner_url ?? "",
    bio_html: c?.bio_html ?? "",
    specialties: Array.isArray(c?.specialties) ? c!.specialties! : [],
    website_url: c?.website_url ?? "",
    instagram_handle: c?.instagram_handle ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
  };
}

export default function TeacherProfileEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: TeacherProfileContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<TeacherProfileContent>
      {...props}
      typeSlug="teacher_profile"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<TeacherProfileContent> }) {
  const { draft, patch, brandTokens } = state;
  const specialties = Array.isArray(draft.specialties) ? draft.specialties : [];
  const setSpecialties = (next: string[]) => patch({ specialties: next });

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Live from AnamayOS (optional)
          </h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            Once this teacher registers in AnamayOS, paste their person ID here and this
            page's name/photo/bio switch to live data automatically.
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>AnamayOS person ID</span>
          <input
            className={inputCls}
            value={draft.ao_person_id ?? ""}
            onChange={(e) => patch({ ao_person_id: e.target.value })}
            placeholder="uuid"
          />
        </label>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Manual fields (fallback / used when no AnamayOS ID)
          </h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Name</span>
            <input
              className={inputCls}
              value={draft.name ?? ""}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Credentials line</span>
            <input
              className={inputCls}
              value={draft.credentials ?? ""}
              onChange={(e) => patch({ credentials: e.target.value })}
              placeholder="RYT-500 · Embodied Rewilding™ founder"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Photo URL (portrait)</span>
            <input
              className={inputCls}
              value={draft.photo_url ?? ""}
              onChange={(e) => patch({ photo_url: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Banner URL (wide hero photo)</span>
            <input
              className={inputCls}
              value={draft.banner_url ?? ""}
              onChange={(e) => patch({ banner_url: e.target.value })}
              placeholder="Leave blank to reuse the portrait"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Bio (HTML)</span>
            <textarea
              className={`${inputCls} min-h-[160px] font-mono text-xs`}
              value={draft.bio_html ?? ""}
              onChange={(e) => patch({ bio_html: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Website URL</span>
            <input
              className={inputCls}
              value={draft.website_url ?? ""}
              onChange={(e) => patch({ website_url: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Instagram handle</span>
            <input
              className={inputCls}
              value={draft.instagram_handle ?? ""}
              onChange={(e) => patch({ instagram_handle: e.target.value })}
              placeholder="@handle"
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls}>Specialty tags</span>
            <button
              type="button"
              onClick={() => setSpecialties([...specialties, ""])}
              className="rounded-full border border-anamaya-green px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-anamaya-green hover:bg-anamaya-green hover:text-white"
            >
              + Add tag
            </button>
          </div>
          <div className="space-y-2">
            {specialties.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={s}
                  onChange={(e) => {
                    const next = [...specialties];
                    next[i] = e.target.value;
                    setSpecialties(next);
                  }}
                  placeholder="Vinyasa, Meditation, Sound Healing..."
                />
                <button
                  type="button"
                  onClick={() => setSpecialties(specialties.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>
    </div>
  );
}
