import "server-only";
import { Sandbox } from "@vercel/sandbox";
import type { SSOUser } from "@/types/sso";

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

/** The script that runs the agent inside the sandbox, written in at runtime. */
function runnerSource(): string {
  return `import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "node:fs";

const instruction = readFileSync(new URL("./.ai-task.txt", import.meta.url), "utf8");

const guidance = [
  "You are the Anamaya AI Site Builder, editing the Anamaya website's code.",
  "Follow CLAUDE.md and the .claude/skills exactly. Match existing patterns.",
  "Make ONLY the change requested; keep it minimal and scoped. Don't refactor.",
  "Do NOT run any git commands and do NOT push — that is handled for you.",
  "When done, briefly state what you changed.",
].join(" ");

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

export async function runBuilderTask(opts: {
  instruction: string;
  user: Pick<SSOUser, "id" | "display_name" | "email">;
  emit: Emit;
}): Promise<void> {
  const { instruction, user, emit } = opts;
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

    await sandbox.writeFiles([{ path: ".ai-task.txt", content: instruction }]);
    await sandbox.writeFiles([{ path: "ai-runner.mjs", content: runnerSource() }]);

    let code = await exec(
      sandbox,
      emit,
      "Installing the AI builder into the workspace…",
      "npm",
      ["install", "--no-audit", "--no-fund", "@anthropic-ai/claude-agent-sdk"],
    );
    if (code !== 0) return emit({ type: "error", text: "Couldn't set up the workspace. Try again." });

    emit({ type: "step", text: "The AI is building your change — this can take a few minutes…" });
    code = await exec(sandbox, emit, "Working…", "node", ["ai-runner.mjs"]);
    if (code !== 0) return emit({ type: "error", text: "The AI run didn't finish cleanly. See the log above." });

    // Drop the scratch files so they don't get committed.
    await sandbox.runCommand({ cmd: "rm", args: ["-f", ".ai-task.txt", "ai-runner.mjs"] });

    const status = await sandbox.runCommand({ cmd: "git", args: ["status", "--porcelain"] });
    if (!(await status.stdout()).trim()) {
      return emit({ type: "result", branch, prUrl: null, text: "No changes were needed for that." });
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

    emit({ type: "step", text: "Opening it for review…" });
    const prUrl = await openPullRequest(
      token,
      branch,
      `AI Site Builder: ${instruction.slice(0, 70)}`,
      `Requested by **${user.display_name || user.email}** via the AI Site Builder.\n\n> ${instruction}`,
    );

    emit({
      type: "result",
      branch,
      prUrl,
      text: prUrl
        ? "Done! Your change is ready to review."
        : `Done! Saved to branch \`${branch}\`. (Couldn't auto-open a review link — open a PR from that branch.)`,
    });
  } catch (err) {
    emit({ type: "error", text: err instanceof Error ? err.message : String(err) });
  } finally {
    try {
      await sandbox?.stop();
    } catch {}
  }
}
