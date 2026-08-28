#!/usr/bin/env node
/**
 * PreToolUse(Bash) hook — enforces the laundry3 git workflow (system rule).
 *
 *   - Work happens on `dev`. Significant changes are pushed to origin/dev.
 *   - `main` is integrated MANUALLY by the user. The agent never commits, merges,
 *     or pushes to `main` / `master`.
 *
 * Blocks (exit 2) a Bash command when it would write to a protected branch.
 * Everything else passes through untouched.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROTECTED = new Set(["main", "master"]);

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0); // not our concern if we can't parse it
}

const cmd = String(payload?.tool_input?.command ?? "");
if (!/\bgit\b/.test(cmd)) process.exit(0);

// Normalise for matching.
const c = cmd.replace(/\s+/g, " ").trim();

function currentBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function block(reason) {
  process.stderr.write(
    `BLOCKED by .claude/hooks/git-guard.mjs (laundry3 system rule)\n${reason}\n` +
      `\nWork on 'dev'. Push significant changes to origin/dev. ` +
      `The user merges 'dev' -> 'main' manually.\n`,
  );
  process.exit(2);
}

const branch = currentBranch();

// 1. Any git write while HEAD is on a protected branch.
const isWrite = /\bgit (commit|merge|rebase|cherry-pick|revert|am|apply)\b/.test(c);
if (isWrite && PROTECTED.has(branch)) {
  block(`Current branch is '${branch}', which is protected. Switch to 'dev' first.`);
}

// 2. push that targets a protected branch, regardless of current branch.
if (/\bgit push\b/.test(c)) {
  // explicit "<src>:<dst>" or "<remote> <branch>" forms
  const pushTargetsProtected =
    /\bpush\b[^\n]*?[: ](main|master)\b/.test(c) ||
    /\bpush\b[^\n]*?\bHEAD:(main|master)\b/.test(c) ||
    (/\bgit push\b\s*(origin\b)?\s*$/.test(c) && PROTECTED.has(branch)) ||
    (/\bgit push\b/.test(c) && !/\bdev\b/.test(c) && PROTECTED.has(branch));
  if (pushTargetsProtected) {
    block("This push would update 'main'/'master' on the remote.");
  }
}

// 3. Deleting / force-moving the dev branch, or checking out main to work on it directly,
//    is allowed (read-only inspection of main is fine); only writes are blocked above.

process.exit(0);
