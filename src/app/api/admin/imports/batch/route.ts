import { batchExtractRetreats } from "@/lib/imports/actions";

export const maxDuration = 300;

/**
 * POST /api/admin/imports/batch
 *
 * Headless driver for the retreat extraction pipeline, so the ~100 legacy
 * WordPress retreats can be converted without clicking through the admin
 * one page at a time.
 *
 * Deliberately inert unless IMPORT_BATCH_KEY is set in the environment
 * AND the caller presents it. The key is intentionally NOT set on Vercel,
 * so the deployed copy of this route refuses every request; it only works
 * against a local dev server where the operator has the key in .env.local.
 * Failing closed means an unset variable disables the endpoint rather than
 * opening it.
 *
 * Body: { limit?: number, url_inventory_ids?: string[], include_already_staged?: boolean }
 */
export async function POST(request: Request) {
  const key = process.env.IMPORT_BATCH_KEY;
  if (!key) {
    return Response.json(
      { error: "Batch extraction is disabled (IMPORT_BATCH_KEY not set)" },
      { status: 403 },
    );
  }
  if (request.headers.get("x-batch-key") !== key) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* defaults below */ }

  const ids = Array.isArray(body.url_inventory_ids)
    ? (body.url_inventory_ids as string[])
    : undefined;

  try {
    const result = await batchExtractRetreats({
      limit: typeof body.limit === "number" ? body.limit : undefined,
      url_inventory_ids: ids,
      include_already_staged: body.include_already_staged === true,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
