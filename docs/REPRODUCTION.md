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
> evaluation split, the real vision client wired, and one cached run — before submission.

## Baseline

```bash
npm run eval -- --mode=baseline --split=evaluation            # first run: needs ANTHROPIC_API_KEY, writes the cache
npm run eval -- --mode=baseline --split=evaluation --replay   # reproduce from cache, no key, no cost
```

## Evaluation (agent vs baseline)

```bash
npm run eval -- --mode=agent --split=evaluation --replay
```

Both write a JSON report to `docs/artifacts/eval-<mode>-<date>.json`. `--replay` serves every
vision call from `data/cache/`; the `smoke` split runs live against the API.

## Expected output

Console shows, per mode: determinate-observation count, **accuracy**, **harmful-error rate**,
**coverage**, accuracy-on-covered, and a 3×3 confusion matrix. _Real values, runtime, and
cost: TBD after the first cached run._
