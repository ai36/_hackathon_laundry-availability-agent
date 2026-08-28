# laundry3

A project for the **micro1 Agentic Workflows Hackathon** — pick a real problem, solve it
with agents, and show the improvement over a fair baseline with evidence.

> Status: **problem scoped, implementation starting.** See `docs/PROBLEM.md` and
> `docs/EVALUATION.md`. Deadline for a working solution: 2026-08-30 12:00 UTC-7.

## The intended user & bottleneck

A tenant in an apartment complex with a **shared laundry room** (~20–30 machines) has no way
to know if a machine is free before hauling a bag of laundry over — so they often carry it
there, find everything occupied, and carry it back to wait and try again.

**laundry3** reads laundry-room camera frames with an agent and publishes a per-machine
free/occupied list to a portal, so the tenant checks availability first and can hold a
machine for the few minutes it takes to walk over.

The hackathon build focuses on the core: an agent that turns a frame (plus a per-site
calibration config and prior state) into a **verified per-machine status list**, measured
against a single-prompt baseline on per-machine accuracy. Full scope, phasing, and the
data/privacy plan are in `docs/PROBLEM.md`.

## Tech stack

TypeScript · Node 24 · Next.js 16 (App Router) · Tailwind CSS v4 · MobX 7 · ESLint 9 ·
Prettier 3. Exact versions and rationale: `docs/DECISIONS.md`.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`,
`npm test`, `npm run check:data`.

Dataset + eval: `npm run dataset:prepare` (needs ffmpeg), then
`npm run eval -- --mode=baseline --split=evaluation [--replay]`.

Full setup from a clean environment: **`docs/REPRODUCTION.md`**.

## Configuring for a real site

Edit **`laundry3.config.ts`** — reservation hold time, per-user reservation limit, machine
count, refresh interval, vision model, cost caps, cycle-length fallbacks, paths. Every
setting is documented in **`docs/CONFIGURATION.md`**; values are validated on load.

## Project layout

```
laundry3.config.ts  Deployment config (site integration knobs)
src/app/            Next.js App Router routes (Server Components by default)
src/components/      React components
src/config/         Typed deployment config: defaults, loader + validator, tests
src/eval/           Label schema types, dataset loaders, scoring
src/agent/          Vision client (+ cache/replay), reply parser, baseline, agent pipeline
src/stores/          MobX RootStore + StoreProvider + domain stores
scripts/            prepare-dataset, run-eval, check-data-privacy
data/               raw/ (ignored) · public/frames/ · labels/ · splits/ · cache/ — see data/README.md
docs/               Hackathon deliverables
.claude/            Claude Code project config, subagents, hooks, slash commands
```

## Documentation

| File | What it holds |
| --- | --- |
| `docs/PROBLEM.md` | Problem, user, bottleneck, scope, definition of "good" |
| `docs/CHANGELOG.md` | **Improvement Changelog** — baseline → iterations → final, with evidence |
| `docs/DECISIONS.md` | Decision log (stack, architecture, skills, config) |
| `docs/REPRODUCTION.md` | Clean-environment setup, commands, expected output |
| `docs/EVALUATION.md` | Metric, cases, procedure, rubric |
| `docs/CONFIGURATION.md` | Every deployment-config setting: type, default, meaning |
| `docs/SKILLS.md` | Connected agent skills and when to use them |
| `docs/HACKATHON-RULES.md` | Full transcription of the hackathon rules |
| `docs/trajectories/` | Agent trajectory records (compliance, calibration, runtime, baseline) |
| `docs/WORKLOG.md` | Chronological record of every change |
| `CLAUDE.md` | Agent working agreement for this repo |

## What existed before the hackathon

Nothing. This repository was created for the hackathon on 2026-08-28. `create-next-app`
provided the initial Next.js scaffold; everything else is documented in `docs/WORKLOG.md`.

## Agent workflow

Built with Claude Code. Two skills are connected: `find-skills` (discover/install more
skills on demand) and `grillme` (Socratic interview to scope the problem and stress-test
claims). See `docs/SKILLS.md`.
