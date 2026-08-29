# Agent Trajectories

Records of what each agent in this project did — kept for hackathon deliverable #4 and
ground rule 9 (every claim tied to evidence).

## What goes here

| Sub-folder | Contents | Present |
| --- | --- | --- |
| `baseline/` | The single-prompt baseline on one frame (the fair-comparison reference), and the calibrated-agent dead-end. | `2026-08-29-recalibrated.md` (current); `2026-08-28-img_1823.md` (historical) |
| `runtime/` | The verification-pass agent (`runAgent`) — retired 2026-08-29 as net-negative; see `docs/CHANGELOG.md` "Historical". | — |
| `compliance/` | Each `hackathon-compliance` review run — verdict, blockers, risks, and the fixes applied. | 14 files |
| `calibration/` | The calibration agent (per-site ROI config from human-confirmed frames). | — (P1, not built) |

Every trajectory here is reproducible offline: the `baseline/` and `runtime/` runs replay
from `data/cache/` with `npm run eval -- --mode=… --split=evaluation --replay` (no API key);
the `compliance/` runs summarise a `hackathon-compliance` subagent invocation.

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
