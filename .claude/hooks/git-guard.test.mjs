#!/usr/bin/env node
/**
 * Smoke test for git-guard.mjs. Runs the hook with canned PreToolUse payloads and
 * asserts the exit code (2 = blocked, 0 = allowed).
 *
 *   node .claude/hooks/git-guard.test.mjs
 *
 * Note: cases that depend on the "current branch" assume the test is run from a
 * checkout whose HEAD is NOT main/master (i.e. the normal `dev` working state).
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HOOK = join(dirname(fileURLToPath(import.meta.url)), "git-guard.mjs");

const cases = [
  {
    name: "commit while on protected branch is blocked only when HEAD is main",
    cmd: "git commit -m x",
    expectOneOf: [0, 2],
  },
  { name: "push origin main -> blocked", cmd: "git push origin main", expect: 2 },
  { name: "push HEAD:main -> blocked", cmd: "git push origin HEAD:main", expect: 2 },
  { name: "push dev:main -> blocked", cmd: "git push origin dev:main", expect: 2 },
  { name: "push -u origin dev -> allowed", cmd: "git push -u origin dev", expect: 0 },
  { name: "git diff HEAD -> allowed", cmd: "git diff HEAD", expect: 0 },
  { name: "git status -> allowed", cmd: "git status", expect: 0 },
  { name: "non-git command -> allowed", cmd: "npm run build", expect: 0 },
];

let failed = 0;
for (const c of cases) {
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_input: { command: c.cmd } }),
    encoding: "utf8",
  });
  const ok = c.expectOneOf ? c.expectOneOf.includes(res.status) : res.status === c.expect;
  console.log(`${ok ? "PASS" : "FAIL"}  [exit ${res.status}]  ${c.name}`);
  if (!ok) {
    failed++;
    if (res.stderr) console.log(res.stderr.trim());
  }
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
