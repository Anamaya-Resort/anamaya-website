import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { getAOAIContext } from "@/lib/ao-ai-context";

export const dynamic = "force-dynamic";

/** GET /api/ai/ao-context — returns live AO AI data for the admin sandbox. */
export async function GET() {
  const user = await getSessionUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getAOAIContext();
  return NextResponse.json(ctx);
}
