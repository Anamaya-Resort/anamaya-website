import { NextResponse } from "next/server";
import { getOrganizationContext } from "@/lib/ai/organization";

/**
 * Public read-only config the visitor chat bubble fetches on mount.
 * Returns just enough to decide whether to render the bubble and what
 * starter questions to show. No models, no keys, no internal data.
 */
export async function GET() {
  const ctx = await getOrganizationContext();
  if (!ctx) {
    return NextResponse.json({ enabled: false });
  }
  if (!ctx.org.visitor_agent_enabled) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({
    enabled: true,
    brandName: ctx.org.name,
    starters: pickStarters(ctx.org.visitor_agent_question_templates),
  });
}

function pickStarters(
  templates: Record<string, string[]> | null,
): string[] {
  if (!templates) return [];
  // Flatten all categories into one set, dedupe, cap at 4.
  const all = Object.values(templates).flat();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of all) {
    const t = (q ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}
