#!/usr/bin/env node
// PreToolUse guard for collaborator sessions (cc.anamaya.com portal + any
// Claude Code session on this repo). Defense-in-depth ON TOP of the
// permissions.deny rules in settings.json: a deny rule blocks by pattern,
// this hook blocks by inspecting the actual tool input.
//
// Exit 0 = allow. Exit 2 = BLOCK (stderr is shown to the model + user).
//
// What it stops:
//   • edits/writes to protected paths (auth, SSO, proxy, deploy config,
//     env, the prod-DB scripts, and these guardrails themselves)
//   • bash that targets the PRODUCTION database, pushes to the production
//     branch, or does something destructive
// It deliberately does NOT try to be clever — it fails closed on a small,
// high-signal set of patterns and lets everything else through.

import { readFileSync } from "node:fs";

const PROD_SUPABASE_REF = "vytqdnwnqiqiwjhqctyi"; // live content DB — never touch from a collaborator session

// Paths a collaborator must never edit. Matched as substrings of the
// repo-relative path (forward-slash normalized).
const PROTECTED_PATHS = [
  ".env",
  "next.config.ts",
  "src/proxy.ts",
  "src/config/sso",
  "src/lib/session",
  "src/lib/supabase-server",
  "src/app/api/auth/",
  "scripts/", // prod-DB extractor/snapshot tooling
  ".claude/", // can't weaken the guardrails
  "package.json",
  "package-lock.json",
  ".github/", // CI / deploy workflows
];

// Bash command fragments that are always blocked.
const BLOCKED_BASH = [
  PROD_SUPABASE_REF, // any command referencing the prod DB
  "git push", // collaborators push via the portal's controlled flow, never directly
  "rm -rf",
  "supabase db push", // schema changes go through committed migrations + review
  "vercel ", // no direct deploys
  "wrangler ", // no direct CF deploys
  "npm publish",
  "npm i -g",
  "npm install -g",
];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function block(reason) {
  process.stderr.write(
    `BLOCKED by repo guardrail: ${reason}\n` +
      `If you genuinely need this, ask the site owner — collaborators can't do it from here.\n`,
  );
  process.exit(2);
}

const raw = readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0); // can't parse → don't get in the way
}

const tool = payload.tool_name || payload.tool || "";
const input = payload.tool_input || payload.toolInput || {};

if (tool === "Edit" || tool === "Write" || tool === "MultiEdit" || tool === "NotebookEdit") {
  const p = String(input.file_path || input.path || input.notebook_path || "").replace(/\\/g, "/");
  const rel = p.replace(/^.*?\/anamaya-website\//, "");
  for (const bad of PROTECTED_PATHS) {
    if (rel.includes(bad)) block(`editing a protected path (${bad}). This file is owner-only.`);
  }
}

if (tool === "Bash") {
  const cmd = String(input.command || "");
  // Catch `git push` even when dressed up, e.g. `git -c x=y push`, `git  push`.
  if (/\bgit\b[\s\S]*\bpush\b/.test(cmd)) {
    block("direct git push. Your branch is pushed for you through the review flow.");
  }
  for (const bad of BLOCKED_BASH) {
    if (cmd.includes(bad)) {
      if (bad === PROD_SUPABASE_REF) block("this command references the PRODUCTION database. Collaborator sessions are staging-only.");
      if (bad === "git push") block("direct git push. Your branch is pushed for you through the review flow.");
      block(`disallowed command (contains "${bad}").`);
    }
  }
}

process.exit(0);
