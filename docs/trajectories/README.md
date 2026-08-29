# Agent Trajectories

Records of what each agent in this project did — kept for hackathon deliverable #4 and
ground rule 9 (every claim tied to evidence).

## What goes here

| Sub-folder | Contents | Present |
| --- | --- | --- |
| `baseline/` | The single-prompt baseline (the fair-comparison reference), the calibrated-agent dead-end, and the ROI agent. | `2026-08-29-recalibrated.md` (baseline + calibrated), `2026-08-29-roi.md` (ROI agent); `2026-08-28-img_1823.md` (historical) |
| `runtime/` | The verification-pass agent (`runAgent`) — retired 2026-08-29 as net-negative. | `2026-08-29-verification-pass-retired.md` |
| _(top level)_ | The integrator-correction loop (Iteration 2 — the improvement). | `2026-08-29-integrator-corrections.md` |
| `compliance/` | Each `hackathon-compliance` review run — verdict, blockers, risks, and the fixes applied. | 32 files |
| `calibration/` | The calibration agent (per-site ROI config from human-confirmed frames). | — (P1, not built) |

Most trajectories here are reproducible offline: `baseline/2026-08-29-recalibrated.md`,
`baseline/2026-08-29-roi.md`, and `2026-08-29-integrator-corrections.md` replay from
`data/cache/` with `npm run eval -- --mode=… --split=evaluation --replay [--corrections]`
(no API key). `runtime/2026-08-29-verification-pass-retired.md` was measured on the retired
9-frame set — its cache was removed in the 2026-08-29 recut and is recoverable from git
history; the per-frame predictions are preserved in
`docs/artifacts/historical/eval-agent-2026-08-28.json`. The `compliance/` runs summarise a
`hackathon-compliance` subagent invocation.

## What does NOT go here

- Raw multi-MB JSONL subagent transcripts — too large and noisy. Save the **final result
  plus the decision-relevant steps** (what the agent did, how tools responded, what feedback
  changed the next step, retries, human checkpoints).
- The full transcript of the human↔Claude-Code build sessions. That is not a required
  deliverable; the process record lives in `docs/WORKLOG.md` and `docs/DECISIONS.md`. If a
  specific build session is worth attaching as a trajectory, export it here as its own file.
- Secrets, API keys, personal data, or unredacted frames with people/belongings.

## File naming

`YYYY-MM-DD-<short-slug>.md` — e.g. `2026-08-28-infra-bootstrap.md`.

## Format

Start each file with: which agent, its instructions file, the trigger/input, the date, and
the model. Then the trajectory (numbered steps or the agent's structured output), then the
outcome and any follow-up actions taken.
