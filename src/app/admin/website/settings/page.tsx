import { getAllSettings } from "@/lib/website-builder/settings";
import PageHeader from "../_components/PageHeader";
import { updateSettingsSection } from "./actions";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-[#dcdcde] last:border-b-0">
      <th className="w-48 px-4 py-3 text-left align-top text-[13px] font-semibold text-[#1d2327]">
        {label}
      </th>
      <td className="px-4 py-3">
        {children}
        {hint && <p className="mt-1 text-[12px] text-[#50575e]">{hint}</p>}
      </td>
    </tr>
  );
}

function SettingsCard({
  title,
  section,
  children,
}: {
  title: string;
  section: "general" | "default_meta" | "tracking";
  children: React.ReactNode;
}) {
  return (
    <form
      action={updateSettingsSection}
      className="mb-6 rounded-sm border border-[#c3c4c7] bg-white"
    >
      <input type="hidden" name="section" value={section} />
      <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">{title}</h2>
      </div>
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
      <div className="border-t border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <button
          type="submit"
          className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "h-7 w-full max-w-xl rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]";
const textareaCls =
  "block w-full max-w-xl rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px]";

export default async function SettingsPage() {
  const settings = await getAllSettings();

  return (
    <div className="px-5 py-4">
      <PageHeader title="Settings" />

      <SettingsCard title="General" section="general">
        <Field label="Site Title">
          <input
            type="text"
            name="site_title"
            defaultValue={settings.general.site_title}
            className={inputCls}
          />
        </Field>
        <Field
          label="Tagline"
          hint="In a few words, explain what this site is about."
        >
          <input
            type="text"
            name="tagline"
            defaultValue={settings.general.tagline}
            className={inputCls}
          />
        </Field>
        <Field label="Timezone" hint="IANA timezone, e.g. Asia/Kolkata">
          <input
            type="text"
            name="timezone"
            defaultValue={settings.general.timezone}
            className={inputCls}
          />
        </Field>
      </SettingsCard>

      <SettingsCard title="Default Meta" section="default_meta">
        <Field
          label="Meta Description"
          hint="Used when a page has no SEO override."
        >
          <textarea
            name="meta_description"
            defaultValue={settings.default_meta.meta_description}
            rows={3}
            className={textareaCls}
          />
        </Field>
        <Field label="Default OG Image">
          <input
            type="text"
            name="og_image_url"
            defaultValue={settings.default_meta.og_image_url}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
      </SettingsCard>

      <SettingsCard title="Tracking & Analytics" section="tracking">
        <Field
          label="Google Analytics 4"
          hint="GA4 measurement ID, e.g. G-XXXXXXXXXX"
        >
          <input
            type="text"
            name="ga4_id"
            defaultValue={settings.tracking.ga4_id}
            placeholder="G-…"
            className={inputCls}
          />
        </Field>
        <Field
          label="Google Tag Manager"
          hint="GTM container ID, e.g. GTM-XXXXXXX"
        >
          <input
            type="text"
            name="gtm_id"
            defaultValue={settings.tracking.gtm_id}
            placeholder="GTM-…"
            className={inputCls}
          />
        </Field>
        <Field label="Meta Pixel" hint="Facebook Pixel ID">
          <input
            type="text"
            name="facebook_pixel_id"
            defaultValue={settings.tracking.facebook_pixel_id}
            className={inputCls}
          />
        </Field>
        <Field
          label="Custom <head> snippet"
          hint="Raw HTML injected into every page's <head>. Use sparingly."
        >
          <textarea
            name="custom_head_html"
            defaultValue={settings.tracking.custom_head_html}
            rows={5}
            className={textareaCls + " font-mono"}
          />
        </Field>
        <Field
          label="Custom <body> snippet"
          hint="Raw HTML injected at the end of every page's <body>."
        >
          <textarea
            name="custom_body_html"
            defaultValue={settings.tracking.custom_body_html}
            rows={5}
            className={textareaCls + " font-mono"}
          />
        </Field>
      </SettingsCard>
    </div>
  );
}
