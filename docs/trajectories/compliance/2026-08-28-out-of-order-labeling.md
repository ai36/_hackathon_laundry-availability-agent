# Compliance review — out_of_order state + labelling workflow + .env

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged 4th machine state (`out_of_order`), camelCase label-key fix, labelling
  workflow (`data/machines.json`, `scripts/label.ts`, `docs/LABELING.md`, D-0010), `.env`
  handling (`.env.example`, `scripts/load-env.ts`)
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G8 clean — `.env.example` ships a blank `ANTHROPIC_API_KEY=`; no secret anywhere in
  the diff. `!.env.example` scoped to the template only. `data/machines.json` is a synthetic
  16+16 placeholder. `scripts/label.ts` writes local JSON only; no real-world side effects.

### Risks (score / process)
1. Harmful-error denominator: `src/eval/score.ts` uses `/ nDeterminate`, but `EVALUATION.md`
   and `PROBLEM.md` said "÷ total observations" → align on "÷ determinate observations".
2. `DECISIONS.md` D-0006 body still used snake_case (`frame_conditions` / `gt_determinate` /
   `observation_notes`), contradicting the amendment's camelCase claim → update the body.
3. `EVALUATION.md` baseline-prompt paraphrase still said "free or occupied" → reflect the
   4-state vocabulary.
4. G10 (pre-existing): `docs/LABELING.md` assumes `data/public/frames/` exists, but frames
   are held out — a clean checkout needs `dataset:prepare` against source media it lacks.
   Already tracked as a pre-submission blocker in `docs/REPRODUCTION.md`.

### Notes
- 4th state carried consistently through types, score.ts (STATES / emptyRow / isHarmful /
  confusion), dataset validator, parse.ts, and both prompts. Test count 10 + 8 + 5 = 23.
- Case renumbering internally consistent (out_of_order = 14, person-in-frame = 15, P0 count
  14→15). Process hygiene satisfied (WORKLOG, D-0006 amendment + D-0010, CHANGELOG row).
- No results/accuracy claims added; G9 not engaged.

## Follow-up actions taken

Same commit: risks 1–3 fixed — harmful-error and coverage denominators reworded to
"÷ determinate observations" in `EVALUATION.md` + `PROBLEM.md` (matching `score.ts`);
D-0006 body rewritten in camelCase with an `out_of_order` pointer; `EVALUATION.md` baseline
prompt now references the shared 4-state vocabulary + `BASELINE_PROMPT` in
`src/agent/baseline.ts`. Risk 4 remains tracked (frames held out); LABELING.md already
points at `dataset:prepare`.
