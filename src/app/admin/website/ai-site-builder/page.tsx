import Link from "next/link";
import PageHeader from "../_components/PageHeader";
import AiSiteBuilderConsole from "./AiSiteBuilderConsole";
import { getSessionUser } from "@/lib/session";
import { recordVisit } from "@/lib/ai-site-builder/access";

export const metadata = { title: "AI Site Builder" };

/**
 * AI Site Builder — a builder tool that sits alongside Blocks / Templates /
 * Redirects. Describe what you want and Claude builds or modifies the block,
 * template, or page for you, on a branch the owner reviews before it goes
 * live. /admin is already SSO-gated, so no extra auth here.
 */
export default async function AiSiteBuilderPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  const user = await getSessionUser();
  if (user) await recordVisit(user);
  const isSuperadmin = user?.role === "superadmin";

  return (
    <div className="mx-auto w-4/5 px-5 py-6 text-[15px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title="AI Site Builder" />
        {isSuperadmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/website/ai-site-builder/presets"
              className="rounded-sm border border-[#2271b1] bg-white px-2 py-[2px] text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
            >
              AI rules
            </Link>
            <Link
              href="/admin/website/ai-site-builder/access"
              className="rounded-sm border border-[#2271b1] bg-white px-2 py-[2px] text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
            >
              Manage access
            </Link>
          </div>
        )}
      </div>

      <p className="mb-4 text-[15px] leading-relaxed text-[#50575e]">
        Describe a change in plain language — a new kind of block, a tweak to a
        template, a fix — and the AI builds it with you. You can paste or upload a
        reference image too. It works on its own branch, never the live site
        directly, and hands the change off for review before it goes live.
      </p>

      <AiSiteBuilderConsole configured={configured} />
    </div>
  );
}
