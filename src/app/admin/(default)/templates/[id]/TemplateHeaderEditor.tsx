"use client";

import { useState } from "react";
import {
  renameTemplateFromForm,
  updateVariantSlugFromForm,
} from "../actions";

/**
 * Inline-edit header for the template page. Click the title (h1) to
 * rename the template; click the slug chip to edit the variant's
 * working slug. Submits via server actions that revalidate the page,
 * so changes appear without a full reload. Only one field is editable
 * at a time so the layout doesn't jump.
 *
 * The "slug" surfaced here is the default-variant slug (e.g.
 * `home_v1`), since that's what the editor actually uses to identify
 * a working template. The page_templates.slug stays as the broad
 * group key (e.g. "home") and isn't shown to keep the UI simple.
 */
export default function TemplateHeaderEditor({
  templateId,
  templateName,
  variantId,
  variantSlug,
}: {
  templateId: string;
  templateName: string;
  variantId: string;
  variantSlug: string;
}) {
  const [editing, setEditing] = useState<"name" | "slug" | null>(null);
  return (
    <div className="mt-2">
      {editing === "name" ? (
        <form
          action={renameTemplateFromForm}
          onSubmit={() => setEditing(null)}
          className="block"
        >
          <input type="hidden" name="id" value={templateId} />
          <input
            name="name"
            defaultValue={templateName}
            autoFocus
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(null);
              }
            }}
            className="w-full max-w-xl rounded-md border border-anamaya-green bg-white px-2 py-1 text-2xl font-semibold text-anamaya-charcoal focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </form>
      ) : (
        <h1
          className="inline-block cursor-pointer rounded text-2xl font-semibold text-anamaya-charcoal hover:bg-zinc-100"
          onClick={() => setEditing("name")}
          title="Click to rename"
        >
          {templateName}
        </h1>
      )}

      <div className="mt-1 flex items-center gap-2 text-sm text-anamaya-charcoal/70">
        <span className="text-xs font-semibold uppercase tracking-wider">
          Slug:
        </span>
        {editing === "slug" ? (
          <form
            action={updateVariantSlugFromForm}
            onSubmit={() => setEditing(null)}
          >
            <input type="hidden" name="variant_id" value={variantId} />
            <input type="hidden" name="template_id" value={templateId} />
            <input
              name="slug"
              defaultValue={variantSlug}
              autoFocus
              onBlur={() => setEditing(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(null);
                }
              }}
              className="rounded border border-anamaya-green bg-white px-1.5 py-0.5 font-mono text-xs text-anamaya-charcoal focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </form>
        ) : (
          <code
            className="inline-block cursor-pointer rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-anamaya-charcoal hover:bg-zinc-200"
            onClick={() => setEditing("slug")}
            title="Click to edit slug"
          >
            {variantSlug}
          </code>
        )}
      </div>
    </div>
  );
}
