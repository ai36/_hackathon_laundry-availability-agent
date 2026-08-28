# Evaluation Plan

Status: **v1, from the 2026-08-28 scoping interview.** Defined before running anything.

## Primary metric

**Overall per-machine state accuracy** — the fraction of (machine, frame) pairs where the
predicted state (`free` / `occupied`) matches the ground-truth label, across the whole
evaluation set.

## Secondary metrics

- **Tokens / cost per frame** — the agent should reach the same accuracy at lower cost than
  the baseline by cropping to ROIs and skipping unchanged regions (P1).
- **Cost per full eval run** — reported in the reproduction guide.
- **Human time per task** — context only: the manual "walk over and check" process cannot be
  scored on the frame set; used for the narrative comparison.

## Cases

A **case** = one `(frame, expected per-machine status list)` pair. One frame, scored by
comparing the predicted state of every machine in it to the ground-truth list. Multi-frame
items (change-detection, abandoned laundry) are **sequence cases** and are P1-only — see
below; they are not counted toward the P0 "10+ cases".

### P0 cases (single-frame, ≥10, same set for baseline and agent)

| # | Frame condition | What it tests |
| --- | --- | --- |
| 1 | Clean wide shot, good light, all machines visible | Nominal accuracy |
| 2 | Different camera angle of the same room, room clear | Viewpoint invariance / ROI mapping |
| 3 | Many washers occupied, dryers mostly free | Washer indicator styles |
| 4 | Many dryers occupied, washers mostly free | Dryer indicator styles |
| 5 | Partial occlusion — a cart/basket in front of one machine (author's own, no personal items) | Robustness to occlusion |
| 6 | Glare / reflection on machine doors | Lighting artefacts |
| 7 | Low / evening light, indicator lights dominant | Low-light handling |
| 8 | Indicator only partially visible for one machine | Low-confidence → verification path |
| 9 | One machine door open, drum empty (idle) next to a closed running machine | free/occupied disambiguation |
| 10 | Mixed cycle phases — machines mid-cycle vs just-finished (door closed, light off) | "finished but not emptied" vs "free" |
| 11 | Near-empty room, 1–2 machines running | Low-occupancy accuracy (few positives) |
| 12 | Near-full room, 1–2 machines free | High-occupancy accuracy (few negatives) |
| 13 (hard) | Person standing in front of the machine bank — **synthetic/augmented**; augmentation source (fully synthetic or licensed/own) recorded next to the frame | Transient obstruction: agent should hold the prior state, not guess, and must not leak identity |

Case 13 reveals whether the agent holds the previous state under a transient obstruction
instead of guessing.

### P1 sequence cases (only if P1 is built)

| # | Sequence | What it tests |
| --- | --- | --- |
| S1 | Two time-ordered frames, machine N flips state between them | Change-detection: only N's ROI is re-analysed |
| S2 | Series where a machine finishes and laundry is left inside | Abandoned-laundry detection + cycle timer |

If P1 is not built, S1/S2 are dropped from the report and the P0 count (13 cases) stands.

## Baseline

- **Primary baseline:** a single Claude vision prompt on the whole frame — "here is a photo
  of a laundry room, list each machine and whether it is free or occupied" — no per-machine
  ROI, no calibration config, no memory, no verification pass. Scored with the same metric on
  the same frames.
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

Per-machine state is a binary label, so accuracy is the rubric. For cases where the
ground-truth itself is ambiguous (e.g. door ajar, no laundry), the label is decided by the
human reviewer during dataset construction and that decision is recorded next to the frame.

## Results

_Populated as runs happen. Raw outputs under `docs/artifacts/`._
