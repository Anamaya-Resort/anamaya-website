import Link from "next/link";
import { getAOAIContext } from "@/lib/ao-ai-context";
import BrandGuidesPanel from "./BrandGuidesPanel";
import ArchetypesPanel from "./ArchetypesPanel";
import ContentPromptsPanel from "./ContentPromptsPanel";
import ProvidersPanel from "./ProvidersPanel";
import AiSandbox from "./AiSandbox";

export const dynamic = "force-dynamic";

export default async function AiAdminPage() {
  const ctx = await getAOAIContext();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-anamaya-charcoal">AnamayOS A.I.</h1>
          <p className="mt-1 text-sm text-anamaya-charcoal/60">
            Live data from AnamayOS — read-only. Edit in{" "}
            <a
              href="https://ao.anamaya.com/dashboard/settings#ai-data"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-anamaya-green"
            >
              AnamayOS Settings → AI Data
            </a>
            .
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
        >
          ← Back to Admin
        </Link>
      </div>

      {ctx.error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <strong>Connection error:</strong> {ctx.error}
        </div>
      )}

      <div className="space-y-4">
        <BrandGuidesPanel guides={ctx.guides} />
        <ArchetypesPanel archetypes={ctx.archetypes} />
        <ContentPromptsPanel prompts={ctx.prompts} />
        <ProvidersPanel providers={ctx.providers} />
        <AiSandbox
          guides={ctx.guides}
          archetypes={ctx.archetypes}
          prompts={ctx.prompts}
          providers={ctx.providers}
        />
      </div>
    </div>
  );
}
