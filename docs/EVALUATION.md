# Evaluation Plan

Status: **v1, from the 2026-08-28 scoping interview.** Defined before running anything.

## Machine state space

Per machine, per frame: **`free` | `occupied` | `out_of_order` | `unknown`**.
`out_of_order` = visibly broken / taped off / hard error — a real determinate state.
`unknown` = not determinable from this evidence (indicator blocked, lights off, glare). See
`docs/PROBLEM.md` for the rationale — abstaining beats a false `free`.

## Primary metric

**Overall per-machine state accuracy** — correct predictions ÷ machine-observations whose
ground truth is **determinate** (`gtDeterminate: true`), across the whole evaluation set.
An agent `unknown` on a determinate ground truth counts as **incorrect**.

## Secondary metrics

- **Harmful-error rate** — predicted `free` while the truth is `occupied` or `out_of_order`,
  ÷ determinate observations (the "wasted trip" errors). Abstaining (`unknown`) is not harmful;
  calling a working machine `out_of_order` is wrong but not harmful. This is where the
  agentic layers (verification, memory) should show a win: same-or-better accuracy with
  fewer harmful errors.
- **Coverage** — actionable predictions (not `unknown`) ÷ total; plus **accuracy-on-covered**.
- **Tokens / cost per frame** — the agent should reach the same accuracy at lower cost than
  the baseline by cropping to ROIs and skipping unchanged regions (P1).
- **Cost per full eval run** — reported in the reproduction guide.
- **Human time per task** — context only: the manual "walk over and check" process cannot be
  scored on the frame set; used for the narrative comparison.

Report all of primary accuracy, harmful-error rate, and coverage for baseline vs agent — a
method that abstains a lot can inflate accuracy-on-covered while leaving the user with no
answer, so the three are read together.

## Cases

A **case** = one `(frame, expected per-machine status list)` pair. One frame, scored by
comparing the predicted state of every machine in it to the ground-truth list. Multi-frame
items (change-detection, abandoned laundry) are **sequence cases** and are P1-only — see
below; they are not counted toward the P0 "10+ cases".

### P0 cases (single-frame, ≥10, same set for baseline and agent)

Each case's `condition` maps to `frameConditions` (frame-wide) and/or `observationNotes`
(one machine) in the label schema — a real transient situation, not a machine attribute.

| # | Condition | Scope | Expected states include | What it tests |
| --- | --- | --- | --- | --- |
| 1 | Clean wide shot, good light, all machines visible | frame | free + occupied | Nominal accuracy |
| 2 | Different camera angle of the same room, room clear | frame | free + occupied | Viewpoint invariance / ROI mapping |
| 3 | Many washers occupied, dryers mostly free | frame | mixed | Washer indicator styles |
| 4 | Many dryers occupied, washers mostly free | frame | mixed | Dryer indicator styles |
| 5 | Cart/basket in front of one machine (author's own, no personal items) | one machine | that machine `unknown` or occluded | Occlusion → abstain vs guess |
| 6 | Glare / reflection on machine doors | frame or per-machine | some may be `unknown` | Lighting artefacts |
| 7 | Low / evening light, indicator lights dominant | frame (`low_light`) | free + occupied | Low-light handling |
| 8 | `lights_off_no_motion` — motion-sensing lamp cut the room dark | frame | mostly `unknown` expected | Agent should abstain, not hallucinate states |
| 9 | Indicator only partially visible for one machine | one machine (`indicator_partial`) | that machine low-confidence | Low-confidence → verification path |
| 10 | One machine door open, drum empty (idle) next to a closed running machine | per-machine | free + occupied | free/occupied disambiguation |
| 11 | Mixed cycle phases — mid-cycle vs just-finished (door closed, light off) | per-machine | occupied ("not emptied") vs free | "finished but not emptied" |
| 12 | Near-empty room, 1–2 machines running | frame | mostly free | Low-occupancy (few positives) |
| 13 | Near-full room, 1–2 machines free | frame | mostly occupied | High-occupancy (few negatives) |
| 14 | At least one machine taped off / showing a hard error (`E rot`, `Err`) | one machine | that machine `out_of_order` | `out_of_order` recognition; must not be called `free` |
| 15 (hard) | Person in front of the machine bank — **synthetic/augmented**; augmentation source (fully synthetic or licensed/own) recorded next to the frame | frame (`person_in_frame`) + blocked machines | blocked machines `unknown` (or prior state under P1) | Transient obstruction: abstain / hold prior, never guess, never leak identity |

Case 15 reveals whether the agent abstains (or, under P1, holds the prior state) for the
machines the person blocks, instead of guessing.

### P1 / P2 sequence cases (only if the relevant feature is built)

| # | Tier | Sequence | What it tests |
| --- | --- | --- | --- |
| S1 | P1 | Two time-ordered frames, machine N flips state between them | Change-detection: only N's ROI is re-analysed |
| S2 | P1 | Series where a machine finishes and laundry is left inside | Abandoned-laundry detection + cycle timer |
| S3 | P2 | A reserved machine is taken by a walk-in during the hold window | Reconciliation: reservation marked pre-empted, portal follows the camera, reserving user re-routed |

Drop rules: **S1/S2 are dropped unless P1 is built; S3 is dropped unless the reservation
simulation is built.** They are independent — P1 built without the reservation sim keeps
S1/S2 and drops S3. Either way the P0 count (15 cases) stands. S3 is scored in the
reservation simulation (reservation-honoured rate), not the per-machine accuracy metric —
see `docs/DECISIONS.md` D-0007.

## Baseline

- **Primary baseline:** a single Claude vision prompt on the whole frame — "list each
  machine and classify it `free` / `occupied` / `out_of_order` / `unknown`" (the same
  4-state vocabulary the agent uses) — no per-machine ROI, no calibration config, no memory,
  no verification pass. Exact text: `BASELINE_PROMPT` in `src/agent/baseline.ts`. Scored
  with the same metric on the same frames.
- **Contextual baseline:** the current manual process (walk to the room, look, walk back).
  Not scored on the dataset; used only to frame human-time / wasted-trip savings.
- **Optional third point:** the same single prompt with an improved / few-shot prompt, to
  show the gain is not just prompt wording.

## Procedure

1. Build the labelled dataset (calibration split + evaluation split — **disjoint**; never
   score on calibration frames).
2. Run the baseline on the evaluation split → cache raw responses → score.
3. Run the calibration step on the calibration split → produce the per-site config.
4. Run the agent on the evaluation split using the config → cache raw responses + full
   trajectories → score.
5. Fill the comparison table in `docs/CHANGELOG.md`.
6. Tie every number to a cached response / trajectory / scoring-script output.

## Reproducibility

- `--replay` re-runs steps 2 and 4 from cached responses: no `ANTHROPIC_API_KEY`, no cost,
  same score.
- A `smoke` subset (3–5 frames) runs live against the API for anyone who wants to verify the
  cache is faithful.

## Rubric

Per-machine state is a 4-way label (`free` / `occupied` / `out_of_order` / `unknown`).
Scoring (`src/eval/score.ts`, `src/eval/score.test.ts`):

- Correct = predicted state equals ground-truth state, over observations with
  `gtDeterminate: true`.
- **Harmful error** = predicted `free` while the truth is `occupied` or `out_of_order` (the
  errors that cost the user a trip). Nothing else is harmful.
- Predicting `unknown` on a determinate GT = incorrect, not harmful (an honest abstention).
- Predicting `out_of_order` on a working machine, or confusing `free`/`occupied` in the
  safe direction = incorrect, not harmful.
- Observations with `gtDeterminate: false` are excluded from primary accuracy and reported
  as a separate "genuinely indeterminable" count.

When the ground truth itself is borderline (door ajar, no laundry), the human labeller
decides during dataset construction and the decision is recorded next to the frame.

## Results

_Populated as runs happen. Raw outputs under `docs/artifacts/`._
