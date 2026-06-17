import "server-only";
import { Sandbox } from "@vercel/sandbox";
import type { SSOUser } from "@/types/sso";
import { buildSystemAddition, classifyChange, MODE_SCOPE, type BuilderMode } from "./presets";

/**
 * The AI Site Builder runtime. Runs entirely on Vercel:
 *   1. spin up an isolated Vercel Sandbox with the repo cloned on a fresh branch
 *   2. run the Claude Agent SDK inside it (it loads this repo's CLAUDE.md +
 *      .claude/skills + guardrails automatically via settingSources: project)
 *   3. commit + push the branch, open a PR for the owner to review
 *
 * The GitHub token is given to git via a credential helper that reads it from
 * the sandbox env at push time, so it never appears in a command argument, a
 * URL, or any log line streamed back to the browser.
 *
 * NOTE: this is v1 — it always hands off a PR for review. Auto-publish for
 * users with the override is a deliberate follow-up (a Publish button on the
 * result), not an automatic merge, so nothing reaches production unreviewed yet.
 */

const OWNER = "Anamaya-Resort";
const REPO = "anamaya-website";

export type RunEvent =
  | { type: "step"; text: string }
  | { type: "log"; text: string }
  | { type: "result"; branch: string; prUrl: string | null; text: string }
  | { type: "error"; text: string };

type Sbx = Awaited<ReturnType<typeof Sandbox.create>>;
type Emit = (e: RunEvent) => void;

function slug(s: string, max: number): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "task"
  );
}

/** Run a command, streaming its output back live, and return the exit code. */
async function exec(
  sandbox: Sbx,
  emit: Emit,
  label: string,
  cmd: string,
  args: string[],
): Promise<number> {
  emit({ type: "step", text: label });
  const c = await sandbox.runCommand({ cmd, args, detached: true });
  for await (const log of c.logs()) {
    const line = log.data.replace(/\s+$/, "");
    if (line) emit({ type: "log", text: line });
  }
  const done = await c.wait();
  return done.exitCode ?? 0;
}

const SCRATCH = [".ai-task.txt", ".ai-guidance.txt", "ai-runner.mjs"];

type ScopeOutcome = { aborted: boolean; denyHits: string[]; reverted: string[]; remaining: number };

/** Parse `git status --porcelain` into entries, excluding our scratch files. */
async function changedFiles(
  sandbox: Sbx,
): Promise<{ path: string; untracked: boolean }[]> {
  const status = await sandbox.runCommand({ cmd: "git", args: ["status", "--porcelain"] });
  const out = await status.stdout();
  const entries: { path: string; untracked: boolean }[] = [];
  for (const raw of out.split("\n")) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    let path = raw.slice(3).trim();
    const arrow = path.indexOf(" -> ");
    if (arrow >= 0) path = path.slice(arrow + 4); // renamed → take the new path
    path = path.replace(/^"|"$/g, "");
    if (SCRATCH.includes(path) || path.startsWith(".ai-reference")) continue;
    entries.push({ path, untracked: code === "??" });
  }
  return entries;
}

/**
 * After a run, revert anything the AI shouldn't have touched. This is the
 * mechanical guard (not a prompt): a GLOBAL_DENY hit reverts EVERYTHING and
 * aborts; files outside the mode's scope are reverted individually while
 * in-scope changes are kept.
 */
async function enforceScope(sandbox: Sbx, mode: BuilderMode, emit: Emit): Promise<ScopeOutcome> {
  const changes = await changedFiles(sandbox);
  const denyHits = changes.filter((c) => classifyChange(c.path, mode) === "deny").map((c) => c.path);
  if (denyHits.length) {
    emit({ type: "log", text: `Blocked protected files: ${denyHits.join(", ")}` });
    await sandbox.runCommand({ cmd: "git", args: ["reset", "--hard", "HEAD"] });
    await sandbox.runCommand({ cmd: "git", args: ["clean", "-fd"] });
    return { aborted: true, denyHits, reverted: [], remaining: 0 };
  }

  const out = changes.filter((c) => classifyChange(c.path, mode) === "out-of-scope");
  for (const c of out) {
    if (c.untracked) await sandbox.runCommand({ cmd: "rm", args: ["-f", c.path] });
    else await sandbox.runCommand({ cmd: "git", args: ["checkout", "--", c.path] });
  }
  if (out.length) emit({ type: "log", text: `Reverted out-of-scope changes: ${out.map((c) => c.path).join(", ")}` });

  const remaining = (await changedFiles(sandbox)).length;
  return { aborted: false, denyHits: [], reverted: out.map((c) => c.path), remaining };
}

/** The script that runs the agent inside the sandbox, written in at runtime. */
function runnerSource(): string {
  return `import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "node:fs";

const instruction = readFileSync(new URL("./.ai-task.txt", import.meta.url), "utf8");
let guidance = "Follow CLAUDE.md and the .claude/skills. Keep changes minimal. Do not run git or push.";
try {
  guidance = readFileSync(new URL("./.ai-guidance.txt", import.meta.url), "utf8") || guidance;
} catch {}

const q = query({
  prompt: instruction,
  options: {
    cwd: process.cwd(),
    settingSources: ["project"],
    permissionMode: "bypassPermissions",
    allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "Skill"],
    disallowedTools: ["WebSearch", "WebFetch"],
    maxTurns: 40,
    appendSystemPrompt: guidance,
  },
});

for await (const m of q) {
  try {
    if (m.type === "assistant") {
      for (const b of m.message?.content ?? []) {
        if (b.type === "text" && b.text.trim()) console.log(b.text.trim());
        else if (b.type === "tool_use") console.log("· " + b.name);
      }
    } else if (m.type === "result") {
      console.log("[agent-result] " + (m.subtype || "done"));
    }
  } catch {}
}
`;
}

async function openPullRequest(
  token: string,
  branch: string,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, head: branch, base: "main", body }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { html_url?: string };
    return json.html_url ?? null;
  } catch {
    return null;
  }
}

export type RefImage = { mediaType: string; base64: string };

const IMG_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function runBuilderTask(opts: {
  instruction: string;
  mode: BuilderMode;
  images?: RefImage[];
  user: Pick<SSOUser, "id" | "display_name" | "email">;
  emit: Emit;
}): Promise<void> {
  const { instruction, mode, user, emit } = opts;
  const images = opts.images ?? [];
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const token = process.env.GITHUB_TOKEN;
  if (!anthropic) return emit({ type: "error", text: "The AI key isn't set on the server." });
  if (!token) return emit({ type: "error", text: "The GitHub token isn't set on the server." });

  const who = slug(user.display_name || user.email || "user", 16);
  const stamp = Date.now().toString(36).slice(-5);
  const branch = `ai/${who}-${stamp}`;

  emit({ type: "step", text: "Creating your private, isolated workspace…" });
  let sandbox: Sbx | null = null;
  try {
    sandbox = await Sandbox.create({
      source: {
        type: "git",
        url: `https://github.com/${OWNER}/${REPO}.git`,
        username: "x-access-token",
        password: token,
        revision: "main",
        depth: 1,
      },
      timeout: 20 * 60 * 1000,
      runtime: "node24",
      resources: { vcpus: 4 },
      env: {
        ANTHROPIC_API_KEY: anthropic,
        GITHUB_TOKEN: token,
        GIT_AUTHOR_NAME: "Anamaya AI Site Builder",
        GIT_AUTHOR_EMAIL: "ai-site-builder@anamaya.com",
        GIT_COMMITTER_NAME: "Anamaya AI Site Builder",
        GIT_COMMITTER_EMAIL: "ai-site-builder@anamaya.com",
      },
    });

    // Keep the remote clean and feed the token via a credential helper, so it
    // is never embedded in a URL/arg that could surface in an error log.
    await sandbox.runCommand({ cmd: "git", args: ["checkout", "-b", branch] });
    await sandbox.runCommand({
      cmd: "git",
      args: [
        "config",
        "credential.helper",
        '!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f',
      ],
    });

    // Save any reference images into the workspace; the agent views them with Read.
    const refFiles: string[] = [];
    images.slice(0, 4).forEach((img, i) => {
      const ext = IMG_EXT[img.mediaType.toLowerCase()] ?? "png";
      refFiles.push(`.ai-reference-${i + 1}.${ext}`);
    });
    const refNote = refFiles.length
      ? `\n\nReference image(s) are saved in this folder: ${refFiles.join(", ")}. Use the Read tool to view each one before building, and match what they show.`
      : "";

    await sandbox.writeFiles([
      { path: ".ai-task.txt", content: instruction + refNote },
      { path: "ai-runner.mjs", content: runnerSource() },
      ...images.slice(0, 4).map((img, i) => ({
        path: refFiles[i],
        content: Buffer.from(img.base64, "base64") as Uint8Array,
      })),
    ]);

    let code = await exec(
      sandbox,
      emit,
      "Installing the AI builder into the workspace…",
      "npm",
      ["install", "--no-audit", "--no-fund", "@anthropic-ai/claude-agent-sdk"],
    );
    if (code !== 0) return emit({ type: "error", text: "Couldn't set up the workspace. Try again." });

    const scopeNote =
      MODE_SCOPE[mode].length > 0
        ? `\n\nIMPORTANT: only create or modify files under: ${MODE_SCOPE[mode].join(", ")}. Anything outside this is undone automatically.`
        : "";

    let outcome: ScopeOutcome | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const retryNote =
        attempt === 2
          ? `\n\nYour previous attempt only changed files OUTSIDE the allowed scope, and they were undone. This time make the change ONLY within the allowed files above.`
          : "";
      await sandbox.writeFiles([
        { path: ".ai-guidance.txt", content: buildSystemAddition(mode) + scopeNote + retryNote },
      ]);

      emit({
        type: "step",
        text: attempt === 1 ? "The AI is building your change — this can take a few minutes…" : "Retrying within the allowed files…",
      });
      code = await exec(sandbox, emit, "Working…", "node", ["ai-runner.mjs"]);
      if (code !== 0) return emit({ type: "error", text: "The AI run didn't finish cleanly. See the log above." });

      emit({ type: "step", text: "Checking the changes are in scope…" });
      outcome = await enforceScope(sandbox, mode, emit);
      if (outcome.aborted) {
        return emit({
          type: "error",
          text: `Blocked: the AI tried to change protected files (${outcome.denyHits.join(", ")}). Nothing was saved.`,
        });
      }
      if (outcome.remaining > 0) break; // we have in-scope changes to keep
      if (attempt === 1 && outcome.reverted.length > 0) continue; // worked out of scope → retry once
      break;
    }

    // Drop the scratch files so they don't get committed.
    await sandbox.runCommand({ cmd: "rm", args: ["-f", ...SCRATCH, ...refFiles] });

    if (!outcome || outcome.remaining === 0) {
      return emit({
        type: "result",
        branch,
        prUrl: null,
        text:
          outcome && outcome.reverted.length
            ? "Everything the AI changed was outside what this mode is allowed to touch, so it was undone. Try General mode, or rephrase the request."
            : "No changes were needed for that.",
      });
    }

    await sandbox.runCommand({ cmd: "git", args: ["add", "-A"] });
    await sandbox.runCommand({
      cmd: "git",
      args: ["commit", "-m", `AI Site Builder: ${instruction.slice(0, 70)}`],
    });
    code = await exec(sandbox, emit, "Saving your change to a branch…", "git", [
      "push",
      "origin",
      branch,
    ]);
    if (code !== 0) return emit({ type: "error", text: "Couldn't save the branch. See the log above." });

    const revertedNote =
      outcome && outcome.reverted.length
        ? `\n\n_Note: ${outcome.reverted.length} out-of-scope change(s) were automatically reverted: ${outcome.reverted.join(", ")}_`
        : "";

    emit({ type: "step", text: "Opening it for review…" });
    const prUrl = await openPullRequest(
      token,
      branch,
      `AI Site Builder: ${instruction.slice(0, 70)}`,
      `Requested by **${user.display_name || user.email}** via the AI Site Builder.\n\n> ${instruction}${revertedNote}`,
    );

    emit({
      type: "result",
      branch,
      prUrl,
      text:
        (prUrl
          ? "Done! Your change is ready to review."
          : `Done! Saved to branch \`${branch}\`. (Couldn't auto-open a review link — open a PR from that branch.)`) +
        (revertedNote ? " Some out-of-scope edits were undone automatically." : ""),
    });
  } catch (err) {
    emit({ type: "error", text: err instanceof Error ? err.message : String(err) });
  } finally {
    try {
      await sandbox?.stop();
    } catch {}
  }
}
