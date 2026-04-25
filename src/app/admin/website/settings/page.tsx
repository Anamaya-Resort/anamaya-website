import { getAllSettings } from "@/lib/website-builder/settings";
import { getOrganizationContext } from "@/lib/ai/organization";
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
  const [settings, orgCtx] = await Promise.all([
    getAllSettings(),
    getOrganizationContext(),
  ]);

  return (
    <div className="px-5 py-4">
      <PageHeader title="Settings" />

      <OrganizationCard ctx={orgCtx} />

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

function OrganizationCard({
  ctx,
}: {
  ctx: Awaited<ReturnType<typeof getOrganizationContext>>;
}) {
  if (!ctx) {
    const hasUrl = !!process.env.AO_SUPABASE_URL;
    const hasKey = !!process.env.AO_SUPABASE_ANON_KEY;
    const hasSlug = !!process.env.AO_ORG_SLUG;
    const missing = [
      !hasUrl && "AO_SUPABASE_URL",
      !hasKey && "AO_SUPABASE_ANON_KEY",
      !hasSlug && "AO_ORG_SLUG",
    ].filter(Boolean) as string[];
    return (
      <div className="mb-6 rounded-sm border border-[#dba617] bg-[#fcf9e8] px-4 py-3 text-[13px] text-[#1d2327]">
        <strong>Organization not synced.</strong>{" "}
        {missing.length > 0 ? (
          <>
            Missing env var{missing.length > 1 ? "s" : ""}:{" "}
            {missing.map((m) => (
              <code key={m} className="mr-1">
                {m}
              </code>
            ))}
            .
          </>
        ) : (
          <>
            Env vars are set, but no active org was found for{" "}
            <code>AO_ORG_SLUG={process.env.AO_ORG_SLUG}</code>. Verify the
            slug exists in AnamayOS and the row has{" "}
            <code>is_active=true</code>, then check that the anon RLS policy
            on <code>organizations</code> allows SELECT.
          </>
        )}
      </div>
    );
  }
  const { org, properties } = ctx;
  return (
    <div className="mb-6 rounded-sm border border-[#c3c4c7] bg-white">
      <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">
          Organization (synced from AnamayOS)
        </h2>
        <p className="mt-1 text-[12px] text-[#50575e]">
          Read-only here — edit in AnamayOS at{" "}
          <code>ao.anamaya.com</code>. AI tools and the visitor agent read
          these values to keep generated content on-brand.
        </p>
      </div>
      <table className="w-full border-collapse">
        <tbody>
          <Field label="Name">
            <code className="text-[13px]">{org.name}</code>{" "}
            <span className="text-[12px] text-[#50575e]">({org.slug})</span>
          </Field>
          {org.legal_name && <Field label="Legal Name">{org.legal_name}</Field>}
          {org.tagline && <Field label="Tagline">{org.tagline}</Field>}
          {org.industry && <Field label="Industry">{org.industry}</Field>}
          {org.primary_offering && (
            <Field label="Primary Offering">{org.primary_offering}</Field>
          )}
          {(org.locale || org.timezone) && (
            <Field label="Locale / Timezone">
              {[org.locale, org.timezone].filter(Boolean).join(" · ") || "—"}
            </Field>
          )}
          {org.booking_url && (
            <Field label="Booking URL">
              <a
                href={org.booking_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#2271b1] hover:underline"
              >
                {org.booking_url}
              </a>
            </Field>
          )}
          {org.contact_url && (
            <Field label="Contact URL">
              <a
                href={org.contact_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#2271b1] hover:underline"
              >
                {org.contact_url}
              </a>
            </Field>
          )}
          {org.sensitive_topics && org.sensitive_topics.length > 0 && (
            <Field
              label="Sensitive Topics"
              hint="The visitor agent will refuse to invent values for these."
            >
              {org.sensitive_topics.join(", ")}
            </Field>
          )}
          <Field
            label="Visitor Agent"
            hint="Public Q&A bubble on marketing pages."
          >
            {org.visitor_agent_enabled ? "Enabled" : "Disabled"}
          </Field>
          {properties.length > 0 && (
            <Field
              label="Properties"
              hint="Sub-properties under this org. Pages can be scoped to one in the editor."
            >
              <ul className="list-disc pl-4 text-[13px]">
                {properties.map((p) => (
                  <li key={p.id}>
                    {p.name}{" "}
                    <span className="text-[12px] text-[#50575e]">
                      ({p.slug}
                      {p.property_type ? ` · ${p.property_type}` : ""})
                    </span>
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </tbody>
      </table>
    </div>
  );
}
