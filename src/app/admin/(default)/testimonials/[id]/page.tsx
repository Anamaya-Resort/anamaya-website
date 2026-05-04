import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { updateTestimonial, deleteTestimonial } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditTestimonial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();
  const { data: t } = await sb
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  async function save(formData: FormData) {
    "use server";
    await updateTestimonial(id, formData);
    redirect("/admin/testimonials");
  }

  async function remove() {
    "use server";
    await deleteTestimonial(id);
    redirect("/admin/testimonials");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">
        Edit review {t.review_number ? `#${t.review_number}` : ""}
      </h1>
      <form
        action={save}
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2"
      >
        <Input name="review_number" label="Review #"   type="number" defaultValue={t.review_number ?? ""} />
        <Input name="review_id"     label="Review ID"  required defaultValue={t.review_id ?? ""} />
        <Input name="review_url"    label="Review URL" className="sm:col-span-2" defaultValue={t.review_url ?? ""} />
        <Input name="title"         label="Title"      className="sm:col-span-2" defaultValue={t.title ?? ""} />
        <Input name="date_of_stay"  label="Date of stay" defaultValue={t.date_of_stay ?? ""} />
        <Input name="trip_type"     label="Trip type"    defaultValue={t.trip_type ?? ""} />
        <Input name="rating"        label="Rating (1-5)" type="number" min={1} max={5} defaultValue={t.rating ?? 5} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Review text
          </label>
          <textarea
            name="review_text"
            required
            rows={8}
            defaultValue={t.review_text ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="published" defaultChecked={!!t.published} />
          Published (visible on site)
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Save
          </button>
          <button
            type="submit"
            formAction={remove}
            className="text-sm text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, className, ...rest } = props;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        {label}
      </span>
      <input
        {...rest}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
      />
    </label>
  );
}
