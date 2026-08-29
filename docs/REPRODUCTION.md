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
npm run dev      # http://localhost:3000  (/tenant, /integrator, /integrator/settings)
npm run build    # production build
npm start        # serve the production build
```

> The `/integrator` console writes to the repo: `data/corrections/` (mark-wrong),
> `data/machines.json` (Machines editor), `data/site-config.json` + `data/site-config/`
> (Cameras editor; the image dir is git-ignored), and `data/config-overrides.json`
> (Settings → Configuration; git-ignored, portal-runtime only — the offline eval always
> uses `laundry3.config.ts`). This is expected — the container in D-0016 owns that state on
> a writable volume. To restore the submitted state:
> `git checkout -- data/ && git clean -fd data/site-config/ && rm -f data/config-overrides.json`.
>
> **`POST /api/refresh`** (the "refresh" button + auto toggle) is **key-optional**:
> with no `ANTHROPIC_API_KEY` it only re-fuses the committed report + corrections — **free**,
> and this is the default. `data/site-config.json` ships **5 seeded cameras** (`C-01…C-05`,
> stub images = the committed eval frames), so **with a key** a manual click runs ~5
> Anthropic vision calls (one per camera feed) and fuses the live reads below corrections.
> The auto toggle is off by default and stops itself after **20 cycles** (~100 calls worst
> case). Results are cached under `data/cache/live/` (git-ignored), so re-runs are free.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (flat config)
npm run format:check # prettier
npm test             # tsx --test — config, scoring, parser, corrections, roster, site-config, overrides (expect: 56/56 pass)
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
is the semantic request, not the image bytes. The recorded cache and the committed frames are
consistent (both recorded against the committed author-redacted frames on `claude-haiku-4-5`).
A fresh `--live` run re-samples the model and shifts the numbers a few points; `--replay` is
exact.

**Recorded baseline run** (`data/cache/baseline/`, model `claude-haiku-4-5`):

| accuracy | harmful-error | coverage | acc-on-covered | cost | runtime |
| --- | --- | --- | --- | --- | --- |
| 62.2% | 2.2% | 95.6% | 65.1% | $0.035 (`--live`) / $0 (`--replay`) | ~20 s `--live`, ~1 s `--replay` |

45 determinate observations over 9 frames.

## Agent (Iteration 1 — verification pass)

```bash
npm run eval -- --mode=agent --split=evaluation --replay      # NO key, NO cost — reproduces the recorded run
npm run eval -- --mode=agent --split=evaluation --live        # re-sample: paid (~14 calls)
```

**Recorded agent run** (`data/cache/agent/`, model `claude-haiku-4-5`):

| accuracy | harmful-error | coverage | acc-on-covered | `out_of_order` | cost |
| --- | --- | --- | --- | --- | --- |
| 57.8% | 0.0% | 100% | 57.8% | 0/8 | $0.051 (`--live`) / $0 (`--replay`) |

Confusion (gt → pred): free 16/11/0/0, occupied 0/10/0/0, out_of_order 0/8/0/0. The verify
pass is **net-negative on accuracy** here (−4.4 pp vs baseline) — kept config-gated as a
studied result. Same 45 determinate observations / 9 frames as the baseline; see
`docs/CHANGELOG.md` for the A/B and the archived `claude-sonnet-5` contrast (`e8de845`).

## Agent + integrator corrections (Iteration 2 — D-0014)

```bash
npm run eval -- --mode=agent --split=evaluation --replay --corrections   # NO key, NO cost
npm run correct -- --list                                               # the 3 corrections on file
```

Overlays `data/corrections/` (3 `machine`-scope entries: `W-04`, `D-02`, `D-06` = out of
service) on the agent predictions before scoring. Report:
`docs/artifacts/eval-agent-corrected-2026-08-28.json`.

| accuracy | harmful-error | coverage | `out_of_order` | model cost |
| --- | --- | --- | --- | --- |
| **75.6%** | 0.0% | 100% | **8/8** | $0.051 (corrections are free) |

+13.4 pp accuracy over baseline at no extra model cost. Confusion (gt → pred): free
16/11/0/0, occupied 0/10/0/0, out_of_order 0/0/0/8.

Both modes write a JSON report to `docs/artifacts/eval-<mode>-<date>.json`. Its `model`
field is read from the cached responses (so a `--replay` of the recorded runs reports
`claude-haiku-4-5`), not from config. The report carries no timestamp so it regenerates
byte-identically.

> `agent.visionModel` defaults to `claude-haiku-4-5` and `agent.visionEffort` to `"none"`
> (haiku rejects the `effort` parameter). A `--live` re-sample runs on haiku; `--replay`
> reproduces the recorded haiku run with no key. The earlier `claude-sonnet-5` run is
> archived at commit `e8de845` (different frames — not point-comparable).

## Expected output

Console: determinate-observation count, **accuracy**, **harmful-error rate**, **coverage**,
accuracy-on-covered, a 4×4 confusion matrix, and an aggregate line (vision calls, tokens,
`$costUsd`); the JSON report carries the same in a `totals` block plus per-frame `meta`.
