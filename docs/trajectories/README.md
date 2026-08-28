# Agent Trajectories

Records of what each agent in this project did — kept for hackathon deliverable #4 and
ground rule 9 (every claim tied to evidence).

## What goes here

| Sub-folder | Contents |
| --- | --- |
| `compliance/` | Output of each `hackathon-compliance` review run (verdict + blockers + risks + notes), one file per run. |
| `calibration/` | Runs of the calibration agent: input frames + human confirmations → the per-site config it produced. |
| `runtime/` | Runs of the runtime agent: input frame(s) + config → per-machine status list, with the verification steps and any retries. |
| `baseline/` | Runs of the single-prompt baseline (for the fair comparison). |

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
