@AGENTS.md

# laundry3

Project for the micro1 **Agentic Workflows Hackathon**. Pick a real problem, solve it with
agents, and prove the improvement over a fair baseline with evidence.

Hackathon brief and rubric: **`docs/HACKATHON-RULES.md`** (full transcription — the source
of truth for what this project must satisfy).

## System rules (non-negotiable)

### 1. Git workflow

- **Remote:** `origin` = `git@github.com:ai36/_hackaton_laundry3.git`.
- **All work happens on `dev`.** Never commit, merge, rebase, or push to `main` / `master` —
  the user integrates `dev → main` manually. This is enforced by
  `.claude/hooks/git-guard.mjs` (PreToolUse hook); do not disable or work around it.
- **Push every significant change** to `origin/dev` once it is committed and has passed the
  compliance review below. "Significant" = anything that changes code, config, deps, docs
  content, agents, hooks, or skills. Trivial scratch edits can wait.
- Commit messages: short imperative summary + why. Group a coherent change per commit.

### 2. Hackathon-rules compliance review

Every time you make a meaningful change to the project, before pushing:

1. Invoke the **`hackathon-compliance`** subagent (`.claude/agents/hackathon-compliance.md`)
   on the diff.
2. If it returns **CHANGES REQUIRED**, fix the blockers before committing/pushing.
3. Record the verdict in `docs/WORKLOG.md` (and address or log any RISKS).

## Golden rule: log every change

Every meaningful change is recorded. After any edit, install, decision, or verification run:

- Append an entry to **`docs/WORKLOG.md`** (newest first). Use `/worklog` or write it by hand.
- If it is a design decision → add/update **`docs/DECISIONS.md`**.
- If it is a hackathon iteration (new skill, verification step, orchestration change,
  measured result) → add a row to **`docs/CHANGELOG.md`**.
- Keep it factual. No marketing language. Connect every results claim to evidence.

## Stack

TypeScript · Node 24 · Next.js 16 (App Router) · Tailwind CSS v4 · MobX 7

Exact versions and the rationale for them: `docs/DECISIONS.md` (D-0001). `package-lock.json`
is the source of truth; reproduction uses `npm ci`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server (http://localhost:3000) |
| `npm run build` | production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run format` / `npm run format:check` | Prettier |

Run `typecheck`, `lint`, and `build` before claiming a change works, and record the result
in `docs/CHANGELOG.md`.

## Layout

```
src/
  app/            Next.js App Router (Server Components by default)
  components/     React components ("use client" + observer for anything reading a store)
  stores/         MobX: RootStore, StoreProvider, domain stores
docs/             Hackathon deliverables (rules, problem, changelog, decisions, reproduction, eval)
.claude/
  agents/         Subagents (hackathon-compliance)
  hooks/          git-guard.mjs — branch protection
  commands/       Slash commands (/worklog)
  settings.json   Permissions + hooks
```

## MobX conventions (see D-0002)

- One `RootStore` composition root; domain stores hang off it.
- Read store state only in Client Components wrapped in `observer` from `mobx-react-lite`.
- State changes only inside actions (`configure({ enforceActions: "always" })`).
- `initRootStore()` gives a fresh store per server render, a singleton in the browser —
  never share one instance across server requests.
- `ExampleStore` / `ExampleCounter` are scaffolding; delete them once real stores exist.

## Skills

Two skills are connected (details: `docs/SKILLS.md`):

- **`find-skills`** — search/install more skills when a real capability gap appears.
- **`grillme`** — Socratic interview. Run it against `docs/PROBLEM.md` before building the
  baseline, and against results claims before they go in the report.
