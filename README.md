# laundry3

A project for the **micro1 Agentic Workflows Hackathon** — pick a real problem, solve it
with agents, and show the improvement over a fair baseline with evidence.

> Status: **infrastructure bootstrap.** The problem statement, baseline, and evaluation are
> not defined yet — see `docs/PROBLEM.md`.

## The intended user & bottleneck

_To be written in `docs/PROBLEM.md` and summarized here: who has the problem, what is slow
or error-prone about how it is handled today, and why solving it is valuable._

## Tech stack

TypeScript · Node 24 · Next.js 16 (App Router) · Tailwind CSS v4 · MobX 7 · ESLint 9 ·
Prettier 3. Exact versions and rationale: `docs/DECISIONS.md`.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.

Full setup from a clean environment: **`docs/REPRODUCTION.md`**.

## Project layout

```
src/app/          Next.js App Router routes (Server Components by default)
src/components/    React components
src/stores/        MobX RootStore + StoreProvider + domain stores
docs/             Hackathon deliverables
.claude/          Claude Code project config + slash commands
```

## Documentation

| File | What it holds |
| --- | --- |
| `docs/PROBLEM.md` | Problem, user, bottleneck, scope, definition of "good" |
| `docs/CHANGELOG.md` | **Improvement Changelog** — baseline → iterations → final, with evidence |
| `docs/DECISIONS.md` | Decision log (stack, architecture, skills) |
| `docs/REPRODUCTION.md` | Clean-environment setup, commands, expected output |
| `docs/EVALUATION.md` | Metric, cases, procedure, rubric |
| `docs/SKILLS.md` | Connected agent skills and when to use them |
| `docs/WORKLOG.md` | Chronological record of every change |
| `CLAUDE.md` | Agent working agreement for this repo |

## What existed before the hackathon

Nothing. This repository was created for the hackathon on 2026-08-28. `create-next-app`
provided the initial Next.js scaffold; everything else is documented in `docs/WORKLOG.md`.

## Agent workflow

Built with Claude Code. Two skills are connected: `find-skills` (discover/install more
skills on demand) and `grillme` (Socratic interview to scope the problem and stress-test
claims). See `docs/SKILLS.md`.
