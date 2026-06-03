import Link from "next/link";
import PageHeader from "../_components/PageHeader";
import AiGenerate from "@/components/admin/AiGenerate";
import { updateSettingsSection } from "../settings/actions";
import { updateTemplateTracking } from "../tracking/actions";
import { updateRobots, updateSitemapConfig, updateSchema } from "./actions";
import { getAllSettings } from "@/lib/website-builder/settings";
import {
  getGlobalTracking,
  getTemplateTracking,
  globalTagSummary,
  templateLabel,
  TEMPLATE_OPTIONS,
} from "@/lib/website-builder/tracking";
import {
  getRobotsConfig,
  getSitemapConfig,
  getSchemaConfig,
  SITE_BASE_URL,
  TECHNICAL_DOCS,
  type TechnicalDocId,
} from "@/lib/website-builder/technical";

const inputCls = "h-7 w-full max-w-xl rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]";
const taCls = "block w-full max-w-2xl rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px] font-mono";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-[#dcdcde] last:border-b-0">
      <th className="w-44 px-4 py-3 text-left align-top text-[13px] font-semibold text-[#1d2327]">{label}</th>
      <td className="px-4 py-3">
        {children}
        {hint && <p className="mt-1 text-[12px] text-[#50575e]">{hint}</p>}
      </td>
    </tr>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-0 rounded-t-sm border border-[#c3c4c7] bg-white">
      <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">{title}</h2>
      </div>
      <table className="w-full border-collapse"><tbody>{children}</tbody></table>
    </div>
  );
}
function SaveBar() {
  return (
    <div className="mb-6 rounded-b-sm border border-t-0 border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
      <button type="submit" className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]">
        Save Changes
      </button>
    </div>
  );
}

export default async function TechnicalPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string; tab?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const doc = (TECHNICAL_DOCS.some((d) => d.id === sp.doc) ? sp.doc : "tracking") as TechnicalDocId;

  return (
    <div className="px-5 py-4">
      <PageHeader title="Technical" />
      <p className="mb-4 max-w-2xl text-[13px] text-[#50575e]">
        Machine-facing site files &mdash; analytics, crawler rules, structured
        data and metadata. Not human content. Each is editable and can be drafted
        with AI.
      </p>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-[#c3c4c7]">
        {TECHNICAL_DOCS.map((d) => (
          <Link
            key={d.id}
            href={`/admin/website/technical?doc=${d.id}`}
            className={`border-b-2 px-3 py-2 text-[13px] ${
              doc === d.id
                ? "border-[#2271b1] font-semibold text-[#1d2327]"
                : "border-transparent text-[#2271b1] hover:text-[#135e96]"
            }`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      {doc === "tracking" && <TrackingDoc tab={sp.tab} template={sp.template} />}
      {doc === "robots" && <RobotsDoc />}
      {doc === "sitemap" && <SitemapDoc />}
      {doc === "schema" && <SchemaDoc />}
      {doc === "meta" && <MetaDoc />}
    </div>
  );
}

// ── Tracking (Global + Templates) ──────────────────────────────────────
async function TrackingDoc({ tab, template }: { tab?: string; template?: string }) {
  const subtab = tab === "templates" ? "templates" : "global";
  return (
    <>
      <div className="mb-4 flex gap-1">
        <Link href="/admin/website/technical?doc=tracking&tab=global"
          className={`rounded-sm px-3 py-1 text-[13px] ${subtab === "global" ? "bg-[#2271b1] text-white" : "bg-[#f0f0f1] text-[#2271b1]"}`}>
          Global
        </Link>
        <Link href="/admin/website/technical?doc=tracking&tab=templates"
          className={`rounded-sm px-3 py-1 text-[13px] ${subtab === "templates" ? "bg-[#2271b1] text-white" : "bg-[#f0f0f1] text-[#2271b1]"}`}>
          Templates
        </Link>
      </div>
      {subtab === "global" ? <TrackingGlobal /> : <TrackingTemplates selected={template ?? ""} />}
    </>
  );
}

async function TrackingGlobal() {
  const t = await getGlobalTracking();
  return (
    <form action={updateSettingsSection}>
      <input type="hidden" name="section" value="tracking" />
      <Card title="Global Tracking — every page">
        <Field label="Google Analytics 4" hint="GA4 measurement ID, e.g. G-XXXXXXXXXX">
          <input type="text" name="ga4_id" defaultValue={t.ga4_id} placeholder="G-…" className={inputCls} />
        </Field>
        <Field label="Google Tag Manager" hint="GTM container ID, e.g. GTM-XXXXXXX">
          <input type="text" name="gtm_id" defaultValue={t.gtm_id} placeholder="GTM-…" className={inputCls} />
        </Field>
        <Field label="Meta Pixel" hint="Facebook Pixel ID (use Head code below for multiple pixels)">
          <input type="text" name="facebook_pixel_id" defaultValue={t.facebook_pixel_id} className={inputCls} />
        </Field>
        <Field label="Head code" hint="Raw HTML injected into <head> of every page.">
          <textarea id="tracking_head" name="custom_head_html" defaultValue={t.custom_head_html} rows={6} className={taCls} />
          <AiGenerate docType="tracking" targetId="tracking_head" placeholder="e.g. Meta Pixel base code for IDs 123, 456" />
        </Field>
        <Field label="Footer code" hint="Raw HTML injected at end of <body> on every page.">
          <textarea name="custom_body_html" defaultValue={t.custom_body_html} rows={6} className={taCls} />
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}

async function TrackingTemplates({ selected }: { selected: string }) {
  const valid = TEMPLATE_OPTIONS.some((o) => o.slug === selected);
  const [tmpl, global] = await Promise.all([
    valid ? getTemplateTracking(selected) : Promise.resolve({ head_html: "", body_html: "" }),
    getGlobalTracking(),
  ]);
  return (
    <>
      <form method="get" className="mb-5 flex items-center gap-2">
        <input type="hidden" name="doc" value="tracking" />
        <input type="hidden" name="tab" value="templates" />
        <label className="text-[13px] font-semibold text-[#1d2327]">Template:</label>
        <select name="template" defaultValue={selected} className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]">
          <option value="">— choose a template —</option>
          {TEMPLATE_OPTIONS.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        <button type="submit" className="rounded-sm border border-[#8c8f94] bg-[#f6f7f7] px-3 py-1 text-[13px] hover:bg-[#eef0f1]">Load</button>
      </form>
      {!valid ? (
        <p className="text-[13px] text-[#50575e]">Choose a template above to edit its tracking code.</p>
      ) : (
        <>
          <form action={updateTemplateTracking}>
            <input type="hidden" name="template_slug" value={selected} />
            <Card title={`${templateLabel(selected)} template`}>
              <Field label="Head code" hint="Added to <head> for pages of this template, on top of global.">
                <textarea name="head_html" defaultValue={tmpl.head_html} rows={6} className={taCls} />
              </Field>
              <Field label="Footer code">
                <textarea name="body_html" defaultValue={tmpl.body_html} rows={6} className={taCls} />
              </Field>
            </Card>
            <SaveBar />
          </form>
          <Card title="Also active here: Global (read-only)">
            <Field label="Structured tags"><span className="text-[13px] text-[#50575e]">{globalTagSummary(global)}</span></Field>
            <Field label="Global head"><textarea readOnly value={global.custom_head_html} rows={3} className={taCls + " bg-[#f0f0f1] text-[#50575e]"} /></Field>
            <Field label=""><Link href="/admin/website/technical?doc=tracking&tab=global" className="text-[13px] text-[#2271b1] hover:underline">Edit global tracking →</Link></Field>
          </Card>
          <div className="mb-6" />
        </>
      )}
    </>
  );
}

// ── robots.txt ─────────────────────────────────────────────────────────
async function RobotsDoc() {
  const cfg = await getRobotsConfig();
  return (
    <form action={updateRobots}>
      <Card title="robots.txt">
        <Field
          label="Custom robots.txt"
          hint="Leave blank to auto-generate (allow all; disallow /admin, /api, /snapshot, /auth; sitemap pointer). Anything here overrides the default."
        >
          <textarea id="robots_custom" name="custom" defaultValue={cfg.custom} rows={10} className={taCls}
            placeholder={`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${SITE_BASE_URL}/sitemap.xml`} />
          <AiGenerate docType="robots" targetId="robots_custom" placeholder="e.g. block AI crawlers except Google-Extended" />
        </Field>
        <Field label="Live file">
          <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-[13px] text-[#2271b1] hover:underline">View /robots.txt →</a>
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}

// ── Sitemap ────────────────────────────────────────────────────────────
async function SitemapDoc() {
  const cfg = await getSitemapConfig();
  return (
    <form action={updateSitemapConfig}>
      <Card title="Sitemap (sitemap.xml)">
        <Field label="About" >
          <p className="text-[13px] text-[#50575e]">
            The sitemap is generated automatically from every published page
            (newest version of each). Use the boxes below to add or exclude URLs.
          </p>
        </Field>
        <Field label="Extra URLs" hint="One absolute URL per line to include beyond the auto-discovered pages.">
          <textarea id="sitemap_extra" name="extra_urls" defaultValue={cfg.extra_urls} rows={5} className={taCls} placeholder={`${SITE_BASE_URL}/some-landing-page/`} />
          <AiGenerate docType="sitemap" targetId="sitemap_extra" placeholder="e.g. list our key landing pages" />
        </Field>
        <Field label="Exclude paths" hint="One path per line (e.g. /private-thing/) to leave OUT of the sitemap.">
          <textarea name="exclude_paths" defaultValue={cfg.exclude_paths} rows={5} className={taCls} placeholder={"/opt-in-thank-you/"} />
        </Field>
        <Field label="Live file">
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-[13px] text-[#2271b1] hover:underline">View /sitemap.xml →</a>
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}

// ── Structured Data ────────────────────────────────────────────────────
async function SchemaDoc() {
  const cfg = await getSchemaConfig();
  return (
    <form action={updateSchema}>
      <Card title="Structured Data (Schema.org JSON-LD)">
        <Field
          label="Site-wide JSON-LD"
          hint="A <script type=&quot;application/ld+json&quot;> block (Organization / Resort / WebSite) injected on every page once tracking injection is wired."
        >
          <textarea id="schema_jsonld" name="global_jsonld" defaultValue={cfg.global_jsonld} rows={12} className={taCls}
            placeholder={'<script type="application/ld+json">{ "@context":"https://schema.org", ... }</script>'} />
          <AiGenerate docType="schema" targetId="schema_jsonld" placeholder="e.g. Resort in Montezuma, Costa Rica with booking + contact" />
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}

// ── Default Meta & OG ──────────────────────────────────────────────────
async function MetaDoc() {
  const s = await getAllSettings();
  return (
    <form action={updateSettingsSection}>
      <input type="hidden" name="section" value="default_meta" />
      <Card title="Default Meta & Open Graph">
        <Field label="Default meta description" hint="Used when a page has no SEO override.">
          <textarea id="meta_desc" name="meta_description" defaultValue={s.default_meta.meta_description} rows={3} className={taCls} />
          <AiGenerate docType="meta" targetId="meta_desc" placeholder="e.g. clifftop wellness resort, Montezuma" />
        </Field>
        <Field label="Default OG image">
          <input type="text" name="og_image_url" defaultValue={s.default_meta.og_image_url} placeholder="https://…" className={inputCls} />
        </Field>
      </Card>
      <SaveBar />
    </form>
  );
}
