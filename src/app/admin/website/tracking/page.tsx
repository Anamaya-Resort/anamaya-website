import Link from "next/link";
import PageHeader from "../_components/PageHeader";
import { updateSettingsSection } from "../settings/actions";
import { updateTemplateTracking } from "./actions";
import {
  getGlobalTracking,
  getTemplateTracking,
  globalTagSummary,
  templateLabel,
  TEMPLATE_OPTIONS,
} from "@/lib/website-builder/tracking";

const inputCls =
  "h-7 w-full max-w-xl rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]";
const textareaCls =
  "block w-full max-w-2xl rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px] font-mono";

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-sm border border-[#c3c4c7] bg-white">
      <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">{title}</h2>
      </div>
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SaveBar() {
  return (
    <div className="-mt-6 mb-6 rounded-b-sm border border-t-0 border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
      <button
        type="submit"
        className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]"
      >
        Save Changes
      </button>
    </div>
  );
}

function Tab({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`border-b-2 px-3 py-2 text-[13px] ${
        active
          ? "border-[#2271b1] font-semibold text-[#1d2327]"
          : "border-transparent text-[#2271b1] hover:text-[#135e96]"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "templates" ? "templates" : "global";
  const selected = sp.template ?? "";

  return (
    <div className="px-5 py-4">
      <PageHeader title="Tracking Code" />
      <p className="mb-4 max-w-2xl text-[13px] text-[#50575e]">
        Add analytics and pixel snippets. Code applies in three layers that
        stack: <strong>Global</strong> (every page) → <strong>Template</strong>{" "}
        (all pages of one type) → <strong>Page</strong> (a single page, set in
        that page&rsquo;s editor). Each layer has a <strong>head</strong> slot
        and a <strong>footer</strong> slot.
      </p>

      <div className="mb-5 flex gap-1 border-b border-[#c3c4c7]">
        <Tab active={tab === "global"} href="/admin/website/tracking?tab=global">
          Global
        </Tab>
        <Tab active={tab === "templates"} href="/admin/website/tracking?tab=templates">
          Templates
        </Tab>
      </div>

      {tab === "global" ? <GlobalTab /> : <TemplatesTab selected={selected} />}
    </div>
  );
}

async function GlobalTab() {
  const t = await getGlobalTracking();
  return (
    <form action={updateSettingsSection}>
      <input type="hidden" name="section" value="tracking" />
      <Card title="Global Tracking — applies to every page">
        <Field label="Google Analytics 4" hint="GA4 measurement ID, e.g. G-XXXXXXXXXX">
          <input type="text" name="ga4_id" defaultValue={t.ga4_id} placeholder="G-…" className={inputCls} />
        </Field>
        <Field label="Google Tag Manager" hint="GTM container ID, e.g. GTM-XXXXXXX">
          <input type="text" name="gtm_id" defaultValue={t.gtm_id} placeholder="GTM-…" className={inputCls} />
        </Field>
        <Field label="Meta Pixel" hint="Facebook Pixel ID">
          <input type="text" name="facebook_pixel_id" defaultValue={t.facebook_pixel_id} className={inputCls} />
        </Field>
        <Field label="Head code" hint="Raw HTML injected into the <head> of every page (Crazy Egg, verification tags, etc.).">
          <textarea name="custom_head_html" defaultValue={t.custom_head_html} rows={6} className={textareaCls} />
        </Field>
        <Field label="Footer code" hint="Raw HTML injected at the end of <body> on every page.">
          <textarea name="custom_body_html" defaultValue={t.custom_body_html} rows={6} className={textareaCls} />
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}

async function TemplatesTab({ selected }: { selected: string }) {
  const valid = TEMPLATE_OPTIONS.some((o) => o.slug === selected);
  const [tmpl, global] = await Promise.all([
    valid ? getTemplateTracking(selected) : Promise.resolve({ head_html: "", body_html: "" }),
    getGlobalTracking(),
  ]);

  return (
    <>
      {/* Template picker (GET form — no JS needed) */}
      <form method="get" className="mb-5 flex items-center gap-2">
        <input type="hidden" name="tab" value="templates" />
        <label className="text-[13px] font-semibold text-[#1d2327]">Template:</label>
        <select name="template" defaultValue={selected} className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]">
          <option value="">— choose a template —</option>
          {TEMPLATE_OPTIONS.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-sm border border-[#8c8f94] bg-[#f6f7f7] px-3 py-1 text-[13px] hover:bg-[#eef0f1]">
          Load
        </button>
      </form>

      {!valid ? (
        <p className="text-[13px] text-[#50575e]">Choose a template above to edit its tracking code.</p>
      ) : (
        <>
          <form action={updateTemplateTracking}>
            <input type="hidden" name="template_slug" value={selected} />
            <Card title={`${templateLabel(selected)} template — applies to every ${templateLabel(selected).toLowerCase()} page`}>
              <Field label="Head code" hint="Injected into <head> for pages of this template, in addition to the global head code.">
                <textarea name="head_html" defaultValue={tmpl.head_html} rows={6} className={textareaCls} />
              </Field>
              <Field label="Footer code" hint="Injected at end of <body> for pages of this template.">
                <textarea name="body_html" defaultValue={tmpl.body_html} rows={6} className={textareaCls} />
              </Field>
            </Card>
            <SaveBar />
          </form>

          {/* Inherited global — read-only, so users know it's already there */}
          <Card title="Also active here: Global tracking (read-only)">
            <Field label="Structured tags">
              <span className="text-[13px] text-[#50575e]">{globalTagSummary(global)}</span>
            </Field>
            <Field label="Global head code">
              <textarea readOnly value={global.custom_head_html} rows={4} className={textareaCls + " bg-[#f0f0f1] text-[#50575e]"} />
            </Field>
            <Field label="Global footer code">
              <textarea readOnly value={global.custom_body_html} rows={4} className={textareaCls + " bg-[#f0f0f1] text-[#50575e]"} />
            </Field>
            <Field label="">
              <Link href="/admin/website/tracking?tab=global" className="text-[13px] text-[#2271b1] hover:underline">
                Edit global tracking →
              </Link>
            </Field>
          </Card>
        </>
      )}
    </>
  );
}
