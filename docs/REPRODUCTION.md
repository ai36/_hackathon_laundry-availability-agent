# Reproduction Guide

Written for someone starting from a clean environment.

## Prerequisites

- **Node.js** 24.x (developed on 24.11.1). Enforced by `package.json` `engines` and
  `.nvmrc` (`nvm use` picks it up). Check with `node --version`.
- **npm** 11.x (ships with Node 24).
- Git (optional, for cloning).
- OS: developed on Windows 11; the stack is cross-platform.

## Setup

```bash
# from the project root
npm ci
git config core.hooksPath .githooks   # enables the dataset privacy pre-commit gate
cp .env.example .env                   # then put your ANTHROPIC_API_KEY in .env (not needed for --replay)
```

`npm ci` installs the exact versions in `package-lock.json`. Do not use `npm install` for
reproduction — it may resolve newer versions.

**Approximate runtime / cost (infra bootstrap stage, 2026-08-28):**

| Step | Wall time | Notes |
| --- | --- | --- |
| `npm ci` | ~20–30 s | ~372 packages (incl. `tsx` dev dep), no native builds |
| `npm run build` | ~5 s | Next.js 16 + Turbopack, warm cache |
| `npm run typecheck` / `lint` | ~1–2 s each | |
| `npm test` | ~1 s | `tsx --test`, config loader/validator |
| Cost | $0 | no paid APIs used yet |

## Run the app

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (flat config)
npm run format:check # prettier
npm test             # tsx --test — config loader/validator (expect: 10/10 pass)
npm run check:data   # dataset privacy gate (also runs as the pre-commit hook)
```

## Agent skills

The agent workflow uses two skills (details in `docs/SKILLS.md`):

```bash
# already installed globally for this environment; to reinstall elsewhere:
npx skills add jekudy/grillme-skill@grillme -g -y
```

`find-skills` is part of the base Claude Code skill set (uses `npx skills find`).

## Dataset

Originals go in `data/raw/` (git-ignored). Build the committable, metadata-stripped frame
set (needs `ffmpeg` on PATH — developed with ffmpeg 8.1.2):

```bash
npm run dataset:prepare -- --fps=1     # → data/public/frames/ + manifest.json
npm run check:data                     # privacy gate (also runs pre-commit)
```

Then label the frames — full step-by-step in **`docs/LABELING.md`**:

```bash
npm run label:new -- <frameId>            # scaffold data/labels/<frameId>.json from data/machines.json
# ...edit each machine's state / bbox from the image...
npm run label:check -- --split=evaluation # validate; npm run label:stats for coverage
```

List frame ids in `data/splits/{calibration,evaluation,smoke}.txt` (must be disjoint).

> **Pre-submission blocker (G10):** the sections below need real numbers — a filled
> evaluation split and one cached run — before submission.

## Baseline

Exactly one backend flag is required (guards against accidental API spend):

```bash
npm run eval -- --mode=baseline --split=evaluation --live     # paid API call; needs ANTHROPIC_API_KEY in .env; writes data/cache/baseline/
npm run eval -- --mode=baseline --split=evaluation --replay   # reproduce from cache, no key, no cost
npm run eval -- --mode=baseline --split=evaluation --fake     # offline wiring check, no cache (empty predictions)
```

## Evaluation (agent vs baseline)

```bash
npm run eval -- --mode=agent --split=evaluation --replay
```

Both write a JSON report to `docs/artifacts/eval-<mode>-<date>.json` (model from
`laundry3.config.ts`). The `smoke` split is the one to run `--live`.

## Expected output

Console shows, per mode: determinate-observation count, **accuracy**, **harmful-error rate**,
**coverage**, accuracy-on-covered, a 4×4 confusion matrix, and an aggregate line (vision
calls, tokens, `$costUsd`); the JSON report carries the same in a `totals` block plus
per-frame `meta`. _Real values, runtime, and cost: TBD after the first `--live` run._
