# Decision Log

Lightweight ADRs. One entry per decision that would otherwise need re-explaining.
Format: ID, date, status, context, decision, consequences.

---

## D-0001 — Technology stack and versions

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The hackathon brief asks for a reproducible project a real person could run
from a clean environment. The requested stack is TypeScript + Node + Next.js + Tailwind CSS
+ MobX, on "current compatible versions".

**Decision.** Use the version set that `create-next-app@latest` pins, rather than the
newest published version of every package:

| Package | Version | Note |
| --- | --- | --- |
| node | 24.x (dev machine: 24.11.1) | LTS-line, supported by Next 16 |
| next | 16.3.3 | latest stable |
| react / react-dom | 19.2.8 | required by Next 16 |
| typescript | ^5 | `create-next-app` default; TS 7.x exists but is not yet vetted against Next 16 + `eslint-config-next` |
| tailwindcss | ^4 via `@tailwindcss/postcss` | CSS-first config (`@import "tailwindcss"` in `globals.css`) |
| eslint | ^9 + `eslint-config-next` 16.3.3 | flat config in `eslint.config.mjs` |
| mobx | ^7 | latest major |
| mobx-react-lite | ^5 | peer deps: `mobx ^7`, `react ^18 || ^19` — compatible |
| prettier | ^3 + `prettier-plugin-tailwindcss` | formatting only; ESLint handles lint |

**Consequences.** The lockfile (`package-lock.json`) is the source of truth; reproduction
uses `npm ci`. If we later need TypeScript 7 or newer majors, that is its own decision
entry with its own verification run.

---

## D-0002 — MobX store architecture

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** Next.js App Router renders on the server. A single shared MobX store instance
across server requests would leak state between users; observer subscriptions created during
SSR would never be disposed.

**Decision.**

- `RootStore` is the single composition root; domain stores hang off it and receive a
  back-reference.
- `initRootStore()` returns a **fresh store per render on the server** and a **memoized
  singleton in the browser**.
- `StoreProvider` (a `"use client"` component) holds the instance in a `useRef` and is
  mounted once in `app/layout.tsx`.
- `enableStaticRendering(typeof window === "undefined")` disables observer tracking on the
  server.
- `configure({ enforceActions: "always" })` — state may only change inside actions.
- A `RootStoreHydration` type is threaded through `initRootStore` so server-fetched data
  can seed the client store later without rework.

**Consequences.** Server Components stay the default; anything that reads store state must
be a Client Component wrapped in `observer`. The `ExampleStore` / `ExampleCounter` pair is
scaffolding and should be deleted once real stores exist.

---

## D-0003 — Connected agent skills

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The hackathon rewards purposeful use of agent capabilities (context, tools,
memory, verification, skills, orchestration).

**Decision.** Connect two skills up front:

- **`find-skills`** — lets the agent search the skills.sh ecosystem (`npx skills find`) and
  install more skills on demand as concrete needs appear during the build.
- **`grillme`** (`jekudy/grillme-skill@grillme`) — Socratic interview skill. Used to pin
  down the problem statement, user, bottleneck, and evaluation before writing feature code,
  and to stress-test claims before they go in the report.

See `docs/SKILLS.md` for usage. Any additional skill installed later gets its own decision
entry and a worklog line.

**Consequences.** Skills run with full agent permissions; each is reviewed before use.
`grillme` is MIT-licensed (source: github.com/jekudy/grillme-skill) and passed
Gen / Socket / Snyk assessments at install time. `find-skills` is part of the base
Claude Code skill set.

---

## D-0004 — Git workflow and automated compliance review

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The project lives at `git@github.com:ai36/_hackaton_laundry3.git`. The user
integrates `main` manually and wants significant progress visible on GitHub as it happens.
Separately, every change must stay within the hackathon rules, checked by an independent
agent rather than only self-review.

**Decision.**

- **Branch model:** all agent work on `dev`; `main` is off-limits to the agent (user merges
  manually). Enforced by a PreToolUse(Bash) hook, `.claude/hooks/git-guard.mjs`, that blocks
  `commit` / `merge` / `rebase` / `push` targeting `main` / `master`. The hook is Node
  (no `jq` on the machine) and keyed off `git branch --show-current` + command-string
  matching.
- **Push cadence:** significant changes are committed and pushed to `origin/dev` after they
  pass the compliance review.
- **Compliance review:** a dedicated `hackathon-compliance` subagent
  (`.claude/agents/hackathon-compliance.md`) reviews each diff against
  `docs/HACKATHON-RULES.md` — ground rules (eligibility BLOCKERS), scoring alignment
  (RISKS), and process hygiene (worklog / changelog / decisions coverage). It is read-only
  (`Read`, `Grep`, `Glob`, `Bash`) and returns PASS / PASS WITH RISKS / CHANGES REQUIRED.
- **Rules in-repo:** the hackathon PDF is transcribed to `docs/HACKATHON-RULES.md` so the
  reviewer and judges work from a version-controlled copy.

**Consequences.** Slightly slower iteration (a review step per push) in exchange for a
standing check against the rubric. The hook can produce a false block on an exotic `git`
invocation; if that happens, adjust the matcher in `git-guard.mjs` rather than disabling the
hook. CLAUDE.md "System rules" section and the `git-workflow` / `compliance-review` memory
entries carry the same rules across sessions.
