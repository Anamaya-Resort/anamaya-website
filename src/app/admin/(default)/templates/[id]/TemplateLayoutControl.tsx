import { updateVariantLayoutFromForm } from "../actions";

/**
 * Choose the template variant's column layout: 1 column, or 2 columns with
 * the side column on the left or right. Each option is a tiny form that posts
 * the full (layout + aside_position) so switching one preserves the other.
 * Server-rendered; no client JS needed.
 */
export default function TemplateLayoutControl({
  templateId,
  variantId,
  layout,
  asidePosition,
}: {
  templateId: string;
  variantId: string;
  layout: string | null | undefined;
  asidePosition: string | null | undefined;
}) {
  const curLayout = layout === "two_col" ? "two_col" : "one_col";
  const curSide = asidePosition === "left" ? "left" : "right";

  const opt = (field: "layout" | "aside", value: string, label: string) => {
    const active = field === "layout" ? curLayout === value : curSide === value;
    return (
      <form action={updateVariantLayoutFromForm} className="inline">
        <input type="hidden" name="template_id" value={templateId} />
        <input type="hidden" name="variant_id" value={variantId} />
        <input type="hidden" name="layout" value={field === "layout" ? value : curLayout} />
        <input type="hidden" name="aside_position" value={field === "aside" ? value : curSide} />
        <button
          type="submit"
          className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
            active
              ? "bg-anamaya-charcoal text-white ring-black"
              : "bg-white text-anamaya-charcoal/70 ring-zinc-300 hover:bg-zinc-50"
          }`}
        >
          {label}
        </button>
      </form>
    );
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/50">
        Layout
      </span>
      <div className="flex gap-1.5">
        {opt("layout", "one_col", "1 column")}
        {opt("layout", "two_col", "2 columns")}
      </div>
      {curLayout === "two_col" && (
        <>
          <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/50">
            Side column
          </span>
          <div className="flex gap-1.5">
            {opt("aside", "left", "Left")}
            {opt("aside", "right", "Right")}
          </div>
        </>
      )}
    </div>
  );
}
