import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { getAvailableModels, type ModelKind } from "@/lib/ai/providers";

const VALID_KINDS: ModelKind[] = [
  "text",
  "image_generate",
  "image_upscale",
  "image_animate",
];

function isModelKind(v: string | null): v is ModelKind {
  return !!v && (VALID_KINDS as string[]).includes(v);
}

/**
 * Returns the merged provider/model list for the active tenant. Used by
 * the AI panel's model picker — active models are listed first, inactive
 * (greyed) below with the reason in a tooltip.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const kind: ModelKind = isModelKind(kindParam) ? kindParam : "text";

  const models = await getAvailableModels(kind);
  return NextResponse.json(models);
}
