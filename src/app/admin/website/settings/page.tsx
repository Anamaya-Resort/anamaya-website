import PageHeader from "../_components/PageHeader";

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
        {hint && (
          <p className="mt-1 text-[12px] text-[#50575e]">{hint}</p>
        )}
      </td>
    </tr>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

const inputCls =
  "h-7 w-full max-w-md rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px] disabled:opacity-50";

export default function SettingsPage() {
  return (
    <div className="px-5 py-4">
      <PageHeader title="Settings" />

      <SettingsCard title="General">
        <Field label="Site Title">
          <input type="text" disabled className={inputCls} />
        </Field>
        <Field label="Tagline" hint="In a few words, explain what this site is about.">
          <input type="text" disabled className={inputCls} />
        </Field>
        <Field label="Site Address (URL)">
          <input type="text" disabled className={inputCls} />
        </Field>
      </SettingsCard>

      <SettingsCard title="Default Meta">
        <Field label="Meta Description" hint="Used when a page has no SEO override.">
          <textarea disabled rows={3} className={inputCls + " h-auto"} />
        </Field>
        <Field label="Default OG Image">
          <input type="text" disabled className={inputCls} placeholder="https://…" />
        </Field>
      </SettingsCard>

      <SettingsCard title="Tracking & Analytics">
        <Field label="Google Analytics 4" hint="GA4 measurement ID, e.g. G-XXXXXXXXXX">
          <input type="text" disabled className={inputCls} placeholder="G-…" />
        </Field>
        <Field label="Meta Pixel" hint="Facebook Pixel ID">
          <input type="text" disabled className={inputCls} />
        </Field>
        <Field
          label="Custom <head> snippet"
          hint="Raw HTML injected into every page's <head>. Use sparingly."
        >
          <textarea disabled rows={5} className={inputCls + " h-auto font-mono"} />
        </Field>
        <Field
          label="Custom <body> snippet"
          hint="Raw HTML injected at the end of every page's <body>."
        >
          <textarea disabled rows={5} className={inputCls + " h-auto font-mono"} />
        </Field>
      </SettingsCard>

      <button
        type="button"
        disabled
        className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] text-white disabled:opacity-50"
      >
        Save Changes
      </button>
      <p className="mt-2 text-[12px] text-[#50575e]">
        Settings storage will be wired up in Phase 6 (site_settings table).
      </p>
    </div>
  );
}
