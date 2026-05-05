"use client";

import { useState } from "react";
import {
  renameTemplateFromForm,
  updateTemplateSlugFromForm,
} from "../actions";

/**
 * Inline-edit header for the template page. Click the name (h1) or
 * the slug code chip to swap that field into edit mode; submit saves
 * via a server action and the page revalidates. Only one field is
 * editable at a time so the layout doesn't jump.
 */
export default function TemplateHeaderEditor({
  id,
  name,
  slug,
}: {
  id: string;
  name: string;
  slug: string;
}) {
  const [editing, setEditing] = useState<"name" | "slug" | null>(null);
  return (
    <>
      {editing === "name" ? (
        <form
          action={renameTemplateFromForm}
          onSubmit={() => setEditing(null)}
          className="mt-1"
        >
          <input type="hidden" name="id" value={id} />
          <input
            name="name"
            defaultValue={name}
            autoFocus
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(null);
              }
            }}
            className="rounded-md border border-anamaya-green bg-white px-2 py-1 text-2xl font-semibold text-anamaya-charcoal focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </form>
      ) : (
        <h1
          className="mt-1 inline-block cursor-pointer rounded text-2xl font-semibold text-anamaya-charcoal hover:bg-zinc-100"
          onClick={() => setEditing("name")}
          title="Click to rename"
        >
          {name}
        </h1>
      )}

      <div className="relative mt-1 flex items-center gap-2">
        {editing === "slug" ? (
          <form
            action={updateTemplateSlugFromForm}
            onSubmit={() => setEditing(null)}
          >
            <input type="hidden" name="id" value={id} />
            <input
              name="slug"
              defaultValue={slug}
              autoFocus
              onBlur={() => setEditing(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(null);
                }
              }}
              className="rounded border border-anamaya-green bg-white px-1.5 py-0.5 font-mono text-[11px] text-anamaya-charcoal focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </form>
        ) : (
          <code
            className="inline-block cursor-pointer rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-anamaya-charcoal/80 hover:bg-zinc-200"
            onClick={() => setEditing("slug")}
            title="Click to edit slug"
          >
            {slug}
          </code>
        )}
      </div>
    </>
  );
}
