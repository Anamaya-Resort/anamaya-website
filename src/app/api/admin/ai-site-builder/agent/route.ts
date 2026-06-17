import { getSession } from "@/lib/session";
import { isAdminRole } from "@/lib/session-shared";
import { runBuilderTask, type RunEvent } from "@/lib/ai-site-builder/runtime";
import { DEFAULT_MODE, isBuilderMode } from "@/lib/ai-site-builder/presets";

/**
 * POST /api/admin/ai-site-builder/agent — runs an AI Site Builder task.
 *
 * /admin is SSO-gated by proxy.ts; we re-check admin here too. Streams progress
 * back as newline-delimited JSON (one RunEvent per line) so the browser shows
 * live status during the multi-minute sandbox run.
 *
 * Long-running: needs a Vercel plan that allows extended function duration.
 * If the run gets cut off early, that's the function time limit — we'd move to
 * a background-job + polling model.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type Body = {
  messages?: { role: string; content: string }[];
  mode?: string;
  images?: { mediaType?: string; base64?: string }[];
};

const ALLOWED_IMG = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAdminRole(session.user.role)) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY || !process.env.GITHUB_TOKEN) {
    return Response.json(
      { error: "The builder isn't fully configured yet (missing AI key or GitHub token)." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const instruction = [...(body.messages ?? [])].reverse().find((m) => m.role === "user")?.content?.trim();
  if (!instruction) {
    return Response.json({ error: "Tell me what to build or change." }, { status: 400 });
  }
  const mode = isBuilderMode(body.mode) ? body.mode : DEFAULT_MODE;
  const images = (body.images ?? [])
    .filter((im) => typeof im?.base64 === "string" && ALLOWED_IMG.has(String(im?.mediaType).toLowerCase()))
    .slice(0, 4)
    .map((im) => ({ mediaType: String(im.mediaType).toLowerCase(), base64: im.base64 as string }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: RunEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {}
      };
      try {
        await runBuilderTask({ instruction, mode, images, user: session.user, emit });
      } catch (err) {
        emit({ type: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
