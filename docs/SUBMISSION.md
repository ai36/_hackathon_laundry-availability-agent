# Submission map — micro1 Agentic Workflows Hackathon

Where each required deliverable lives, and the fastest path for a judge to reproduce the main
result. Everything is key-free and offline unless a step says `--live`.

## The one-minute reproduction

```bash
npm ci
git config core.hooksPath .githooks
npm run synthesize -- --replay                                            # regenerate the 3 reading-rules (already committed in data/machines.json)
npm run eval -- --mode=baseline --split=evaluation --replay                # 45.5%  — the fair baseline
npm run eval -- --mode=roi      --split=evaluation --replay --fragments    # 63.6%  — the feedback loop (automated; see caveats below)
npm run eval -- --mode=baseline --split=evaluation --replay --corrections  # 68.2%  — the override on its own
```

No `ANTHROPIC_API_KEY` needed. Each run re-scores from the committed cache in `data/cache/`
and prints accuracy, harmful-error rate, coverage, `out_of_order` recall, and a confusion
matrix. The 3 reading-rules are already committed in `data/machines.json`; `npm run synthesize
-- --replay` regenerates them idempotently. Full walkthrough incl. a `--live` re-sample:
**`docs/REPRODUCTION.md`**.

**Read the feedback-loop result honestly:** 63.6 % is the first automated configuration to
clear the baseline *on this 5-frame set* — all 3 loop samples (63.6 / 59.1 / 63.6 %) beat
45.5 %, `out_of_order` recall 0/5 → 3/5. But: n = 22, one committed loop sample (2
author-attested re-runs); the baseline was not re-sampled, so the "+18.2 pp" is
single-vs-single; all 3 corrections are `out_of_order`, so the rules are broken-machine cues;
and of the 5 cells fixed, 1 is in-sample and 2 are cue-consistency on the same broken unit —
only 2 are genuine cross-machine spillover. A production number needs a temporal / held-out
capture set (`docs/CHANGELOG.md` "Iteration 3", `docs/DECISIONS.md` D-0014 "Status
(2026-08-30)").

Every hackathon simplification — no live camera, hand-painted ROI, 5 frozen frames, no
container, simulated reservations — is listed with its production TODO in
**`docs/LIMITATIONS.md`**.

## The four deliverables

| # | Deliverable | Where |
| --- | --- | --- |
| 1 | **Solution code + Improvement Changelog** | whole repo; `README.md` (user, bottleneck, value, results, failure mode, hot take); **`docs/CHANGELOG.md`** is the labelled Improvement Changelog, one row per experiment tied to a report in `docs/artifacts/` |
| 2 | **Reproduction guide** | **`docs/REPRODUCTION.md`** — clean-environment setup, exact commands for baseline / calibrated / ROI / feedback loop / corrections, expected output, versions, runtime, cost |
| 3 | **Solution video (~5 min)** | script & shot list at **`docs/VIDEO-SCRIPT.md`**; the recording is submitted separately per the hackathon form |
| 4 | **Agent trajectories** | **`docs/trajectories/`** — see the table below |

## Agents used, and their trajectories

| Agent / component | Instructions | Trajectory | Reproduces |
| --- | --- | --- | --- |
| Baseline (`runBaseline`) | `src/agent/baseline.ts` | `docs/trajectories/baseline/2026-08-29-recalibrated.md` | `--mode=baseline --replay` |
| Calibrated agent (`runCalibrated`) — **dead-end, −13.7 pp** | `src/agent/calibrated.ts` | same file (part 2) | `--mode=calibrated --replay` |
| ROI agent (`runRoi`) — **iteration, −4.6 pp on its own** | `src/agent/roi.ts` | `docs/trajectories/baseline/2026-08-29-roi.md` | `--mode=roi --replay` |
| Verification pass (`runAgent`) — **removed, −4.4 pp** | `src/agent/pipeline.ts` | `docs/trajectories/runtime/2026-08-29-verification-pass-retired.md` | from pre-2026-08-29 git history; predictions in `docs/artifacts/historical/` |
| Integrator corrections — **the override, +22.7 pp** | D-0014; `src/eval/corrections.ts` | `docs/trajectories/2026-08-29-integrator-corrections.md` | `--mode=baseline --replay --corrections` |
| Correction → prompt synthesis — **automated, clears baseline on this set** (see caveats above) | D-0014; `src/eval/prompt-synthesis.ts` | `docs/trajectories/2026-08-30-feedback-loop.md` | `npm run synthesize --replay` + `--mode=roi --replay --fragments` |
| `grillme` skill (problem scoping) | `.claude/skills/grillme` | result: `docs/PROBLEM.md`; decision: `docs/DECISIONS.md` D-0005 | n/a |
| `hackathon-compliance` subagent (independent reviewer) | `.claude/agents/hackathon-compliance.md` | `docs/trajectories/compliance/*.md` (37 runs) | n/a |

## Ground-rules compliance

| Rule | How it is met |
| --- | --- |
| 2 — what existed before | `README.md` "What existed before the hackathon" — nothing; `create-next-app` scaffold only. Every change is a dated `docs/WORKLOG.md` entry. |
| 4 — sandbox + human approval | No consequential real-world action. The portal simulates capture; a reservation is an in-repo hold; a correction requires an explicit integrator submit. |
| 5 — qualified human in the loop | The integrator reviews every card and is the only path to a correction (D-0014). |
| 7 — data you may share | Frames are the author's own, downscaled, EXIF-stripped, with hand-drawn redactions over identifying content. `npm run check:data` gates it (also a pre-commit hook). |
| 8 — credentials outside the submission | `.env` is git-ignored; only `.env.example` is committed. `npm run check:data` scans staged data. |
| 9 — every claim tied to evidence | Each `docs/CHANGELOG.md` row cites a `docs/artifacts/eval-*.json` report; all reports regenerate byte-identically from `--replay`. |
| 10 — judges can run it | Key-free `--replay` reproduces every number; `npm run dev` walks the full correction loop with no API key and no hardware. |

## Repository access

All work is on the **`dev`** branch. The maintainer integrates `dev → main` manually before
submission; if the submission link points at a branch, it points at `dev`.

## Verification status (2026-08-30)

`typecheck` · `lint` · `format:check` · `build` · `check:data` — pass. `npm test` — 96/96.
`--replay` reproduces `baseline` 45.5 %, `calibrated` 31.8 %, `roi` 40.9 %, **`roi
--fragments` 63.6 %**, `baseline --corrections` 68.2 %, `roi --fragments --corrections`
72.7 % exactly. `npm run synthesize --replay` reproduces the 3 synthesised rules
idempotently (no file change). The D-0014 loop is also wired into the portal
(`POST /api/corrections` synthesises on a durable correction when a key is set;
`/api/refresh` classifies with the fragments) — the measured number is still the offline
`--replay` chain only.
