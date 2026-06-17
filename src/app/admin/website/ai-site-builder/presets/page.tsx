import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { MODES, buildSystemAddition } from "@/lib/ai-site-builder/presets";
import PageHeader from "../../_components/PageHeader";

export const metadata = { title: "AI Site Builder — AI rules" };

/**
 * Superadmin-only, READ-ONLY view of the exact prompt presets injected for each
 * mode. Shown so the owner always knows what's in effect. Editing is in code
 * only (src/lib/ai-site-builder/presets.ts), by design.
 */
export default async function AiSiteBuilderPresetsPage() {
  const me = await getSessionUser();
  if (me?.role !== "superadmin") {
    redirect("/admin/website/ai-site-builder");
  }

  return (
    <div className="mx-auto w-4/5 px-5 py-6 text-[15px]">
      <PageHeader title="AI Site Builder — AI rules" />

      <p className="mb-4 text-[15px] leading-relaxed text-[#50575e]">
        These are the exact instructions added to the AI for each mode — a{" "}
        <strong>Global</strong> set that always applies, plus the mode&apos;s own
        rules (Writing also gets the brand voice). They&apos;re the{" "}
        <em>guidance</em> layer (scope, quality, asking before guessing). What
        actually protects the live site is separate and unbreakable by wording:
        every change is a branch + a pull request you review, and the guard hook,
        repo-only token, and sandbox block anything dangerous. This view is
        read-only — the rules are managed in code so they&apos;re version-tracked.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {MODES.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-sm border border-[#c3c4c7] bg-white shadow-sm">
            <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-3">
              <h2 className="text-[22px] font-bold leading-tight text-[#1d2327]">{m.label}</h2>
              <p className="mt-0.5 text-[14px] text-[#50575e]">{m.blurb}</p>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-4 py-3 text-[13px] leading-snug text-[#1d2327]">
              {buildSystemAddition(m.id)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Link href="/admin/website/ai-site-builder" className="text-[13px] text-[#2271b1] hover:underline">
          ← Back to AI Site Builder
        </Link>
      </div>
    </div>
  );
}
