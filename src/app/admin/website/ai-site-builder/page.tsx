import PageHeader from "../_components/PageHeader";
import AiSiteBuilderConsole from "./AiSiteBuilderConsole";

export const metadata = { title: "AI Site Builder" };

/**
 * AI Site Builder — a builder tool that sits alongside Blocks / Templates /
 * Redirects. Describe what you want and Claude builds or modifies the block,
 * template, or page for you, on a branch the owner reviews before it goes
 * live. /admin is already SSO-gated, so no extra auth here.
 */
export default function AiSiteBuilderPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="px-5 py-4">
      <PageHeader title="AI Site Builder" />

      <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-[#50575e]">
        Describe a change in plain language — a new kind of block, a tweak to a
        template, a fix — and the AI builds it with you. It works on its own
        branch against the staging content, never the live site directly. When
        it looks right, it hands the branch off for review before going live.
      </p>

      <AiSiteBuilderConsole configured={configured} />
    </div>
  );
}
