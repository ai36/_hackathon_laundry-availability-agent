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

> The portal writes to the repo: `data/corrections/` (mark-wrong), `data/machines.json`
> (Machines editor; `npm run synthesize` and — with a key — a durable `POST /api/corrections`
> write `promptFragment`s here), `data/site-config.json` + `data/site-config/` (Cameras editor; the
> image dir is git-ignored), `data/config-overrides.json` (Settings → Configuration), and
> `data/reservations.json` (Live status holds). The last two are git-ignored and
> portal-runtime only — the offline eval always uses `laundry3.config.ts` and never reads
> reservations. This is expected — the container in D-0016 owns that state on a writable
> volume. To restore the submitted state:
> `git checkout -- data/ && git clean -fd data/site-config/ && rm -f data/config-overrides.json data/reservations.json`.
>
> **`POST /api/refresh`** (the "refresh" button + auto toggle) is **key-optional**:
> with no `ANTHROPIC_API_KEY` it only re-fuses the committed baseline report + corrections —
> **free**, and this is the default. `data/site-config.json` ships **5 cameras** (`C-01…C-05`,
> stub = the committed eval frames), so **with a key** a manual click runs ~5 vision calls
> (one whole-frame `baselinePrompt` call per camera) and fuses the live reads below
> corrections. The auto toggle is off by default and stops after **20 cycles**. Results cache
> to `data/cache/live/` (git-ignored). The region map on each camera feeds the offline
> `--mode=roi` eval; the `img_*.annotated.jpg` files feed the `--mode=calibrated` dead-end
> only (no longer a portal input). The live route uses the plain baseline call, matching the
> shipped "baseline + corrections" config.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (flat config)
npm run format:check # prettier
npm test             # tsx --test — config, scoring, parser, corrections, roster, site-config, overrides, reservations, calibration-config guard, requestHash, camera-classify, calibrated + ROI eval, prompt-synthesis, feedback loop (expect: 96/96 pass)
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

**Recorded baseline run** (`data/cache/baseline/`, model `claude-haiku-4-5`, 2026-08-29):

| accuracy | harmful-error | coverage | `out_of_order` | cost | runtime |
| --- | --- | --- | --- | --- | --- |
| 45.5% | 9.1% | 100% | 0/5 | ~$0.017 (`--live`) / $0 (`--replay`) | ~15 s `--live`, ~1 s `--replay` |

22 determinate observations over 5 frames (one per camera). Confusion (gt → free / occupied /
out_of_order / unknown): free 4/6/0/0, occupied 1/6/0/0, out_of_order 1/4/0/0.

## Calibrated agent — documented dead-end

```bash
npm run eval -- --mode=calibrated --split=evaluation --replay   # NO key, NO cost — reproduces the recorded run
npm run eval -- --mode=calibrated --split=evaluation --live     # re-sample: paid (~5 calls)
```

The baseline call plus the camera's annotated shot + analysis mask as extra vision inputs
(`data/cache/calibrated/`, `claude-haiku-4-5`, 2026-08-29):

| accuracy | harmful-error | coverage | `out_of_order` | cost |
| --- | --- | --- | --- | --- |
| 31.8% | 0.0% | 100% | 0/5 | ~$0.034 (`--live`) / $0 (`--replay`) |

**−13.7 pp vs baseline** — the model reads state off the flat-colour annotation and the mask
image collapses it onto `occupied` for every machine (`free` recall 0/10; the 0% harmful is
an artefact of never saying `free`). Reproduced on `claude-sonnet-5` and four prompt
phrasings; none beat the baseline. Kept only so the negative result reproduces — see
`docs/CHANGELOG.md` "Recalibrated evaluation".

## ROI agent — right architecture, not a measured win

```bash
npm run eval -- --mode=roi --split=evaluation --replay   # NO key, NO cost — reproduces the recorded run
npm run eval -- --mode=roi --split=evaluation --live     # re-sample: paid (~16 calls); needs sharp (installed by next)
```

`camera.mask` is a **region map** — each machine's body/panel painted one solid colour,
`camera.maskLegend` maps `hex → id`. `--mode=roi` crops the live frame to each machine's
colour region and classifies one machine (or one stacked pair) per call — no positional
inference. `data/cache/roi/`, `claude-haiku-4-5`, 2026-08-29:

| accuracy | harmful-error | coverage | `out_of_order` | cost |
| --- | --- | --- | --- | --- |
| 40.9% | 9.1% | 86.4% | 0/5 | ~$0.022 (`--live`) / $0 (`--replay`) |

The frozen config scores **40.9% on all 3 samples** (`docs/artifacts/eval-roi-samples-2026-08-29.md`)
— a small consistent shortfall vs the baseline's 45.5%. On its own it is not a win; it is the
surface the feedback loop below attaches per-machine rules to. `--mode=roi` needs `sharp` (an
explicit `devDependency`; `npm ci` installs it).

## Feedback loop — correction → `promptFragment` (D-0014, Iteration 3) — clears baseline on this set

**How the 63.6 % was produced** — the exact chain, all key-free from committed state:

```bash
npm run eval -- --mode=baseline --split=evaluation --replay              # 1. the baseline (45.5%) — its report holds the model's per-cell rationale
npm run correct -- --list                                               # 2. the 3 integrator corrections on file (W-04 / D-02 / D-06)
npm run synthesize -- --replay                                          # 3. synthesise the 3 reading-rules into data/machines.json (idempotent — same bytes)
npm run eval -- --mode=roi --split=evaluation --replay --fragments      # 4. classify WITH the rules, WITHOUT the override → 63.6%
npm run eval -- --mode=roi --split=evaluation --replay --fragments --corrections  # loop + override → 72.7%
```

Paid variants (need `ANTHROPIC_API_KEY`): `npm run synthesize -- --live` (~3 calls),
`npm run eval -- --mode=roi --live --fragments` (~16 calls).

`npm run synthesize` reads each correction + the model's own wrong rationale (from the step-1
report) and writes a per-machine **reading-rule** into `data/machines.json` (`fragmentSource:
"synthesis"`). It is **idempotent** — re-running regenerates a prior synthesis output from
scratch (it does not merge into it), so `--replay` produces `data/machines.json` byte-for-byte
as committed. `--mode=roi --fragments` appends each rule to that machine's ROI call — separate
cache (`data/cache/roi-fragments/`) and report, so the plain `--mode=roi` artifacts are
byte-identical.

**In the portal** (D-0014 wired 2026-08-30): with a key set, saving a `machine`-scope
correction on `/integrator` runs step 3 automatically (`POST /api/corrections` → response
`synthesized: {...}`), and the next **"↻ refresh recognition"** classifies with the rule
(`/api/refresh` now folds `promptFragment`s into its prompt). Key-free, the portal skips
synthesis and says so. The learned rule is advisory (integrator corrections stay
authoritative) and revertible — `git checkout -- data/machines.json` or the Machines editor.
Either way the **measured** number above comes only from the offline `--replay` chain,
independent of any portal action; the portal path is not separately measured.

`claude-haiku-4-5`, `docs/artifacts/eval-roi-fragments-2026-08-30.json`:

| accuracy | harmful-error | coverage | `out_of_order` | cost |
| --- | --- | --- | --- | --- |
| **63.6%** | 4.5%¹ | 81.8% | 3/5 | ~$0.023 (`--live`) / $0 (`--replay`) |

¹ noisy — 3 live samples: accuracy 63.6 / 59.1 / 63.6 %, harmful 4.5 / 18.2 / 4.5 %,
`out_of_order` 3/5 all three (`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`).

**The first automated config to clear the baseline on this set** — all 3 loop samples
(63.6 / 59.1 / 63.6 %) beat 45.5 %. The **+18.2 pp** is one committed loop sample vs one
baseline sample (the baseline was not re-sampled). 4 of its 5 fixes over plain ROI are on
cells the rules were not derived from: 2 the same broken unit / same cue on a different frame
(cue-consistency), 2 genuine cross-machine spillover in a shared crop. Limits: n=22, one
committed loop sample, all 3 corrections are `out_of_order`; a full number needs a temporal /
held-out capture set. See `docs/CHANGELOG.md` Iteration 3 and
`docs/trajectories/2026-08-30-feedback-loop.md`.

## Baseline + integrator corrections (D-0014) — the override on its own

```bash
npm run eval -- --mode=baseline --split=evaluation --replay --corrections   # NO key, NO cost
npm run correct -- --list                                                   # the 3 corrections on file
```

Overlays `data/corrections/` (3 `machine`-scope entries: `W-04`, `D-02`, `D-06` = out of
service) on the baseline predictions before scoring. Report:
`docs/artifacts/eval-baseline-corrected-2026-08-29.json`.

| accuracy | harmful-error | coverage | `out_of_order` | model cost |
| --- | --- | --- | --- | --- |
| **68.2%** | **4.5%** | 100% | **5/5** | ~$0.017 (corrections are free) |

+22.7 pp accuracy over baseline at no extra model cost; the 3 corrections cover 5 determinate
observations across cameras C-01–C-04. Confusion (gt → pred): free 4/6/0/0, occupied 1/6/0/0,
out_of_order 0/0/5/0. `--mode=calibrated … --corrections` gives 54.5% from the lower base.

Each mode writes a JSON report to `docs/artifacts/eval-<mode>-<date>.json` where `<date>` is
the **run date** — so a `--replay` today writes a *new, untracked* file (e.g.
`eval-baseline-2026-08-31.json`), not an in-place update of the committed
`…-2026-08-29.json`. The **content** is byte-identical (the report carries no timestamp, and
`model` is read from the cached responses, not config): compare the JSON bodies, not the
filenames. Delete the new-dated file afterwards if you want a clean tree.

> `agent.visionModel` defaults to `claude-haiku-4-5` and `agent.visionEffort` to `"none"`
> (haiku rejects the `effort` parameter). A `--live` re-sample runs on haiku; `--replay`
> reproduces the recorded haiku run with no key. The earlier `claude-sonnet-5` run is
> archived at commit `e8de845` (different frames — not point-comparable).

## Expected output

Console: determinate-observation count, **accuracy**, **harmful-error rate**, **coverage**,
accuracy-on-covered, a 4×4 confusion matrix, and an aggregate line (vision calls, tokens,
`$costUsd`); the JSON report carries the same in a `totals` block plus per-frame `meta`.
