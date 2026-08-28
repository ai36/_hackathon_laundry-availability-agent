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
npm test             # tsx --test — config, scoring, reply-parser (expect: 23/23 pass)
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

## Baseline

Exactly one backend flag is required (guards against accidental API spend):

```bash
npm run eval -- --mode=baseline --split=evaluation --replay   # reproduce the recorded run — NO key, NO cost, ~1 s
npm run eval -- --mode=baseline --split=evaluation --live     # re-sample: paid API call; needs ANTHROPIC_API_KEY in .env; rewrites data/cache/baseline/
npm run eval -- --mode=baseline --split=evaluation --fake     # offline wiring check, no cache (empty predictions)
```

`--replay` works from a clean checkout even **without `data/public/frames/`** — the cache key
is the semantic request, not the image bytes. The 9 labelled eval stills *are* committed, but
they now carry heavier author-drawn redaction boxes than the frames the cache was recorded
against, so a fresh `--live` run will differ from the recorded numbers by a few points where
a box clips a display; `--replay` stays exact. Refreshing the cache with a `--live` pass on
the committed frames is pending.

**Recorded baseline run** (`data/cache/baseline/`, model `claude-sonnet-5`):

| accuracy | harmful-error | coverage | acc-on-covered | cost | runtime |
| --- | --- | --- | --- | --- | --- |
| 31.1% | 11.1% | 60.0% | 51.9% | $0.081 (`--live`) / $0 (`--replay`) | ~40 s `--live`, ~1 s `--replay` |

45 determinate observations over 9 frames. The model is stochastic — a fresh `--live` run
shifts these a few points (see `docs/EVALUATION.md` limitations); `--replay` is exact.

## Agent (Iteration 1 — verification pass)

```bash
npm run eval -- --mode=agent --split=evaluation --replay      # NO key, NO cost — reproduces the recorded run
npm run eval -- --mode=agent --split=evaluation --live        # re-sample: paid (18 calls)
```

**Recorded agent run** (`data/cache/agent/`, model `claude-sonnet-5`):

| accuracy | harmful-error | coverage | acc-on-covered | `out_of_order` | cost |
| --- | --- | --- | --- | --- | --- |
| 31.1% | 8.9% | 51.1% | 60.9% | 2/8 | $0.170 (`--live`) / $0 (`--replay`) |

Confusion (gt → pred): free 9/4/14/0, occupied 2/3/5/0, out_of_order 2/1/3/2. Same 45
determinate observations / 9 frames as the baseline — see `docs/CHANGELOG.md` for the A/B.

Both modes write a JSON report to `docs/artifacts/eval-<mode>-<date>.json`. Its `model`
field is read from the cached responses (so a `--replay` of the recorded runs reports
`claude-sonnet-5`), not from config. The report carries no timestamp so it regenerates
byte-identically.

> The default `agent.visionModel` is now `claude-haiku-4-5` (cost). A fresh `--live`
> re-sample therefore runs on haiku unless you pass `LAUNDRY3_VISION_MODEL=claude-sonnet-5`
> to match the recorded numbers. `--replay` always reproduces the recorded sonnet-5 run.

## Expected output

Console: determinate-observation count, **accuracy**, **harmful-error rate**, **coverage**,
accuracy-on-covered, a 4×4 confusion matrix, and an aggregate line (vision calls, tokens,
`$costUsd`); the JSON report carries the same in a `totals` block plus per-frame `meta`.
