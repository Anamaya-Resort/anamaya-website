"use client";

import { useRef, useState } from "react";
import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import type { OrgBranding } from "@/config/brand-tokens";
import type { VideoShowcaseContent } from "@/types/blocks";
import { uploadHeroVideo } from "../../actions";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: VideoShowcaseContent | null | undefined): VideoShowcaseContent {
  return {
    ...(c ?? {}),
    bg_color: c?.bg_color ?? "brandSubtle",
    padding_y_px: c?.padding_y_px ?? 48,
    title_top: c?.title_top ?? "",
    title_top_font: c?.title_top_font ?? "heading",
    title_top_size_px: c?.title_top_size_px ?? 32,
    title_top_color: c?.title_top_color ?? "",
    title_top_bold: c?.title_top_bold ?? false,
    title_top_italic: c?.title_top_italic ?? false,
    title_bottom: c?.title_bottom ?? "",
    title_bottom_font: c?.title_bottom_font ?? "body",
    title_bottom_size_px: c?.title_bottom_size_px ?? 18,
    title_bottom_color: c?.title_bottom_color ?? "",
    title_bottom_bold: c?.title_bottom_bold ?? false,
    title_bottom_italic: c?.title_bottom_italic ?? false,
    video_source: c?.video_source ?? "youtube",
    youtube_url: c?.youtube_url ?? "",
    video_url: c?.video_url ?? "",
    video_poster_url: c?.video_poster_url ?? "",
    video_max_width_px: c?.video_max_width_px ?? 800,
  };
}

export default function VideoShowcaseEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: VideoShowcaseContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<VideoShowcaseContent>
      {...props}
      typeSlug="video_showcase"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<VideoShowcaseContent> }) {
  const { draft, setDraft, commit, patch, brandTokens } = state;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickVideo(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadHeroVideo(fd);
      patch({ video_url: url, video_source: "upload" });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <span className={labelCls}>Background color</span>
          <BrandColorSelect
            value={draft.bg_color}
            onChange={(v) => patch({ bg_color: v })}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
        <label className="block w-32">
          <span className={labelCls}>Padding Y (px)</span>
          <input
            type="number"
            min={0}
            max={400}
            className={inputCls}
            value={draft.padding_y_px ?? 48}
            onChange={(e) =>
              setDraft((d) => ({ ...d, padding_y_px: Number(e.target.value) || 0 }))
            }
            onBlur={commit}
          />
        </label>
      </div>

      <TitleGroup label="Top title" state={state} prefix="title_top" />

      {/* Video */}
      <section className="rounded-md border border-zinc-200 p-4">
        <h4 className="mb-2 text-[15px] font-semibold uppercase tracking-wider text-anamaya-charcoal">
          Video
        </h4>
        <div className="mb-3 inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-[11px] font-semibold uppercase tracking-wider">
          {(["youtube", "upload"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ video_source: s })}
              className={`rounded-sm px-3 py-1 transition-colors ${
                draft.video_source === s
                  ? "bg-anamaya-charcoal text-white"
                  : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
              }`}
            >
              {s === "youtube" ? "YouTube" : "Upload"}
            </button>
          ))}
        </div>
        {draft.video_source === "youtube" ? (
          <label className="block">
            <span className={labelCls}>YouTube URL or video ID</span>
            <input
              className={inputCls}
              value={draft.youtube_url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, youtube_url: e.target.value }))}
              onBlur={commit}
              placeholder="https://youtu.be/dQw4w9WgXcQ"
            />
          </label>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : draft.video_url ? "Replace video" : "Upload video"}
            </button>
            {draft.video_url && (
              <code className="ml-2 font-mono text-[11px] text-anamaya-charcoal/60">
                {draft.video_url}
              </code>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) pickVideo(f);
              }}
            />
          </div>
        )}
        {uploadError && (
          <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 ring-1 ring-red-200">
            {uploadError}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <label className="block max-w-xs">
            <span className={labelCls}>Max width (px)</span>
            <input
              type="number"
              min={200}
              max={1920}
              className={inputCls}
              value={draft.video_max_width_px ?? 800}
              onChange={(e) =>
                setDraft((d) => ({ ...d, video_max_width_px: Number(e.target.value) || 800 }))
              }
              onBlur={commit}
            />
          </label>
          <div className="flex-1 min-w-[240px]">
            <div className="mb-1 flex items-center justify-between">
              <span className={labelCls}>Poster image (optional)</span>
              <ImageUploadButton
                value={draft.video_poster_url}
                onUploaded={(url) => patch({ video_poster_url: url })}
                kind="video-posters"
                maxWidth={1800}
              />
            </div>
            <input
              className={inputCls}
              value={draft.video_poster_url ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, video_poster_url: e.target.value }))
              }
              onBlur={commit}
              placeholder="Paste a URL or use Upload →"
            />
          </div>
        </div>
      </section>

      <TitleGroup label="Bottom title" state={state} prefix="title_bottom" />

      <CtaFieldset cta={draft} onChange={(u) => patch(u)} brandTokens={brandTokens} />
    </>
  );
}

type TitlePrefix = "title_top" | "title_bottom";

function TitleGroup({
  label,
  state,
  prefix,
}: {
  label: string;
  state: BlockEditorState<VideoShowcaseContent>;
  prefix: TitlePrefix;
}) {
  const { draft, setDraft, commit, patch, brandTokens } = state;
  const k = {
    text: `${prefix}` as keyof VideoShowcaseContent,
    font: `${prefix}_font` as keyof VideoShowcaseContent,
    size: `${prefix}_size_px` as keyof VideoShowcaseContent,
    color: `${prefix}_color` as keyof VideoShowcaseContent,
    bold: `${prefix}_bold` as keyof VideoShowcaseContent,
    italic: `${prefix}_italic` as keyof VideoShowcaseContent,
  };
  const textVal = (draft[k.text] as string) ?? "";
  const fontVal = (draft[k.font] as "body" | "heading") ?? "heading";
  const sizeVal = (draft[k.size] as number) ?? 24;
  const colorVal = (draft[k.color] as string) ?? "";
  const boldVal = !!draft[k.bold];
  const italicVal = !!draft[k.italic];

  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <h4 className="mb-2 text-[15px] font-semibold uppercase tracking-wider text-anamaya-charcoal">
        {label}
      </h4>
      <label className="block">
        <span className={labelCls}>Text</span>
        <input
          className={inputCls}
          value={textVal}
          onChange={(e) => setDraft((d) => ({ ...d, [k.text]: e.target.value }))}
          onBlur={commit}
          placeholder="Leave blank to hide"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Font</span>
          <BrandFontSelect value={fontVal} onChange={(v) => patch({ [k.font]: v } as Partial<VideoShowcaseContent>)} />
        </div>
        <div>
          <span className={labelCls}>Color</span>
          <BrandColorSelect
            value={colorVal}
            onChange={(v) => patch({ [k.color]: v } as Partial<VideoShowcaseContent>)}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <label className="block w-32">
          <span className={labelCls}>Size (px)</span>
          <input
            type="number"
            min={10}
            max={200}
            className={inputCls}
            value={sizeVal}
            onChange={(e) => setDraft((d) => ({ ...d, [k.size]: Number(e.target.value) || 0 }))}
            onBlur={commit}
          />
        </label>
        <StyleToggle label="B" pressed={boldVal} onClick={() => patch({ [k.bold]: !boldVal } as Partial<VideoShowcaseContent>)} bold />
        <StyleToggle label="I" pressed={italicVal} onClick={() => patch({ [k.italic]: !italicVal } as Partial<VideoShowcaseContent>)} italic />
      </div>
    </section>
  );
}

function StyleToggle({
  label,
  pressed,
  onClick,
  bold,
  italic,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors ${
        pressed
          ? "border-anamaya-green bg-anamaya-green/10 text-anamaya-charcoal"
          : "border-zinc-300 bg-white text-anamaya-charcoal/70 hover:bg-zinc-50"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {label}
    </button>
  );
}
