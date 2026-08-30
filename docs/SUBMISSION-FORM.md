# Submission form — ready-to-paste content

The "Create submission" form has four required fields: **Title**, **Description**,
**Video URL**, **Source Code**. Copy the two blocks below; the last two sections tell you
what to put in the file / URL fields. Deadline: **2026-08-31 11:00 America/Los_Angeles**.

Before you submit: merge `dev → main` (`git checkout main && git merge --ff-only dev && git push`),
record the video, then fill the form.

---

## 1. Title  → paste into "Title"

```
laundry3 — shared-laundry availability from camera frames, improved by a correction feedback loop
```

---

## 2. Description  → paste into "Description" (the editor accepts formatting; markdown pastes cleanly)

### What it is

**laundry3** turns laundry-room camera frames into a per-machine **free / occupied /
out-of-order / unknown** list, so a tenant checks before hauling a laundry bag downstairs.

### The user & the bottleneck

A tenant in an apartment complex with a shared laundry room (16 washers + 16 dryers). Today
they fill a bag, carry it down, and often find every machine busy — then carry it back, wait
an unknown time, and try again. There's no way to check first, and no way to hold a machine
for the two minutes it takes to walk over. Solving it removes wasted trips and physical
effort; for the building it means better-used machines and fewer complaints.

### Baseline (the fair comparison)

One Claude vision call on the whole frame, told which machine IDs that camera covers. No
cropping, no calibration, no memory. **45.5 % per-machine accuracy**, harmful-error rate
9.1 %, `out_of_order` recall 0/5. It reads every lit display — including the always-on price
panel and hard-error screens — as a running cycle.

### How agents are used

- **Solution agent** (`src/agent/`) — vision classifier behind a `VisionClient` interface
  with a response cache, so every scored run reproduces key-free (`--replay`).
- **Integrator corrections** (`npm run correct`, `src/eval/corrections.ts`) — a
  human-in-the-loop store the agent treats as authoritative; a durable `machine`-scope
  correction encodes a lasting fact (a broken unit).
- **Correction → prompt synthesis** (`npm run synthesize`, `src/eval/prompt-synthesis.ts`) —
  **the feedback loop (Iteration 3)**: a model reads each correction + the classifier's own
  wrong rationale and writes a one-line per-machine **reading-rule** into
  `data/machines.json`; the ROI agent (`--mode=roi --fragments`) and the live portal
  (`/api/refresh`) then classify with the rule. Wired end-to-end into the portal
  (`POST /api/corrections` synthesises on a durable correction when a key is set).
- **`grillme` skill** — a Socratic interview that turned the one-line brief into the scoped
  problem, metric, and dataset plan.
- **`hackathon-compliance` subagent** — an independent reviewer run on every change against
  the hackathon rules (36 recorded reviews under `docs/trajectories/compliance/`); it caught
  a reproducibility blocker and several over-claims.

### Results — `claude-haiku-4-5`, 5 committed frames (one per camera), 22 determinate observations

| Config | Accuracy | Harmful-error | Coverage | `out_of_order` recall |
| --- | --- | --- | --- | --- |
| Baseline | 45.5 % | 9.1 % | 100 % | 0/5 |
| Calibrated (annotated shot + mask as vision inputs) — **dead-end** | 31.8 % | 0.0 % | 100 % | 0/5 |
| ROI (per-machine colour-region crops) — on its own | 40.9 % | 9.1 % | 86.4 % | 0/5 |
| **ROI + fragments (feedback loop, Iteration 3)** | **63.6 %** | 4.5 %¹ | 81.8 % | 3/5 |
| **Baseline + integrator corrections (override)** | **68.2 %** | 4.5 % | 100 % | 5/5 |
| ROI + fragments + corrections | **72.7 %** | 4.5 % | 86.4 % | 5/5 |

¹ noisy — 3 `--live` samples of the frozen rules scored accuracy 63.6 / 59.1 / 63.6 %,
harmful-error 4.5 / 18.2 / 4.5 %, `out_of_order` 3/5 all three.

**Read the feedback-loop result honestly.** 63.6 % is the first *automated* configuration to
clear the baseline **on this 5-frame set** (all 3 loop samples beat 45.5 %; `out_of_order`
recall 0/5 → 3/5). But: n = 22, one committed loop sample; the baseline was not re-sampled,
so the "+18.2 pp" is single-vs-single (the robustness claim is 3/3 loop runs above baseline);
all 3 corrections are `out_of_order`, so the synthesised rules are broken-machine cues, not a
`free`↔`occupied` reading-rule test; and of the 5 cells fixed vs plain ROI, 1 is in-sample
and 2 are "same broken unit, same cue, different frame" (cue-consistency) — only 2 are
genuine cross-machine spillover. A production number needs a **temporal / held-out capture
set** (re-shoot the 5 angles at a different time). The override (`Baseline + corr.`) scores
higher on the corrected cells (it is ground truth there) but does not generalise; the loop
generalises but is not a guarantee.

Success bar (set before the runs, qualitative): an iteration wins if it raises accuracy above
baseline **and** does not increase the harmful-error rate, bonus for lifting `out_of_order`
recall off zero. No pre-registered numeric threshold.

### Improvement changelog (full version: `docs/CHANGELOG.md`)

Baseline 45.5 % → **verification pass** −4.4 pp (removed, kept as a documented negative
result) → **image calibration** −13.7 pp (dead-end) → **ROI** −4.6 pp on its own (right
architecture, kept as the surface the loop attaches to) → **integrator corrections** +22.7 pp
(the guaranteed override) → **feedback loop** 63.6 % (first automated config to clear the
baseline on this set). Every row cites a report in `docs/artifacts/` and reproduces from
`--replay`.

### Main failure mode & hot take

**Failure mode:** the model reads the price panel, not the cycle — it treats the always-lit
`2.25` price display as a countdown and an `E rot` hard-error as a running cycle.

**Hot take:** the highest-leverage work was building the metric *before* the agent and being
willing to log a negative result — a verification pass and image calibration both *looked*
like progress and were regressions, and only separate harmful / coverage / `out_of_order`
scoring made that legible. And the agentic design that finally cleared the baseline was not a
cleverer one-shot prompt — it was the loop: a human overrules one failure, that correction is
synthesised into a durable reading-rule, and the model applies it itself on frames it never
saw (including a rule for one machine fixing an un-corrected neighbour). Let a correction
*teach the model a rule*, not just patch one cell.

### Reproduce the main result (no API key, no cost — from the Source Code zip)

```bash
npm ci
git config core.hooksPath .githooks
npm run eval -- --mode=baseline --split=evaluation --replay                # 45.5 % — the fair baseline
npm run synthesize -- --replay                                            # regenerate the 3 reading-rules (already committed)
npm run eval -- --mode=roi      --split=evaluation --replay --fragments    # 63.6 % — the feedback loop
npm run eval -- --mode=baseline --split=evaluation --replay --corrections  # 68.2 % — the override on its own
```

Each run re-scores from the committed cache in `data/cache/` and prints accuracy,
harmful-error rate, coverage, `out_of_order` recall, and a confusion matrix.
Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` (96), `npm run
check:data`. Portal: `npm run dev` → `/tenant`, `/integrator`, `/integrator/settings`.
Full clean-environment guide: **`docs/REPRODUCTION.md`**. Deliverables map: **`docs/SUBMISSION.md`**.

### What's in the zip

Complete project. `README.md` (start here), `docs/CHANGELOG.md` (Improvement Changelog),
`docs/REPRODUCTION.md`, `docs/EVALUATION.md`, `docs/DECISIONS.md`, `docs/trajectories/`
(agent trajectories + 36 compliance reviews), `docs/VIDEO-SCRIPT.md`. `data/cache/` and
`data/public/frames/` are included so `--replay` works offline. `node_modules/` is not —
`npm ci` rebuilds it. Nothing that existed before the competition except the `create-next-app`
scaffold; every change is a dated entry in `docs/WORKLOG.md`.

---

## 3. Video URL  → paste into "Video URL"

Not yet recorded. Record from **`docs/VIDEO-SCRIPT.md`** (~5 min, Russian narration + English
dub), upload as an **unlisted YouTube / Vimeo** video, and paste the link here. The script is
already aligned to the final code state (feedback loop built, measured, portal-wired).

`<PASTE_VIDEO_URL_HERE>`

---

## 4. Source Code  → upload into "Source Code" (max 50 MB)

Build the archive from the **post-merge `main` HEAD** — it must contain this
`docs/SUBMISSION-FORM.md` and every later commit, so do it **after** `dev → main`:

```bash
git checkout main
git archive --format=zip --prefix=laundry3/ -o laundry3-$(git rev-parse --short HEAD).zip HEAD
```

`git archive` includes exactly the tracked files (~292 at HEAD) — no `node_modules`, no
`.git`, no untracked scratch. `data/cache/` and `data/public/frames/` are tracked, so
`--replay` works from the zip offline. Expect roughly 3 MB, well under the 50 MB limit.

---

## Pre-submit checklist

- [ ] `git checkout main && git merge --ff-only dev && git push origin main`
- [ ] rebuild `laundry3-<sha>.zip` from `main` HEAD
- [ ] on a clean checkout of the zip: `npm ci` then the three `npm run eval` lines above
      print 45.5 / 63.6 / 68.2 (and `npm test` → 96/96)
- [ ] record the video from `docs/VIDEO-SCRIPT.md`, upload unlisted, copy the URL
- [ ] paste Title, Description, Video URL; attach the zip; **Submit** (not "Save as Draft")
