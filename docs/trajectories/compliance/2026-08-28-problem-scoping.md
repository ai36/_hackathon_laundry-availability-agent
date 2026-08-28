# Compliance review — problem scoping

- **Agent:** hackathon-compliance (run via a general-purpose subagent following
  `.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged docs from the problem-scoping session (PROBLEM.md, EVALUATION.md
  rewrites; DECISIONS.md D-0005; CHANGELOG.md, WORKLOG.md, README.md, cspell.json). No code
  changed.
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G4 (soft, reversible, auto-expiring 5-min reservation; simulated; no hardware; "can't
  reserve all machines" guard rail), G5 (human confirms per-machine decisions during
  calibration), G6/G7/G8 (no data in repo yet; filming plan = own room, no people, tight
  framing, identifying details removed, manager OK, person-in-frame case synthetic;
  `ANTHROPIC_API_KEY` only as an env-var name) all addressed with sound plans. No
  baseline/eval results expected yet, tracked as TBD.

### Risks (score / process)
1. **G6/G7 data plan:** "no people present" doesn't cover other tenants' baskets/belongings
   visible in a 20–30-machine shared room; a manager's OK doesn't extend to tenants'
   belongings → add an explicit exclude/blur rule + confirm manager authorization covers
   filming the common area.
2. **G7 provenance** of the synthetic "person in frame" (EVALUATION case) → record the
   augmentation source next to the frame.
3. **G5 runtime review** still an open question → close and document the decision before the
   evaluation is presented as final.
4. **Feasibility:** solo, ~2 days. Keep Iteration 1 (ROI calibration) and Iteration 2
   (verification pass) inside P0 so the changelog has ≥2 real measured iterations.

### Notes
- Eval set mixed P0-scoreable and P1-dependent cases → define scoring or mark P1-only so
  "10+ cases" holds for P0.
- "case" defined as one (frame, status-list) pair but some cases used a pair/series →
  tighten or split.
- `cspell.json` adds "hackaton" — justified (remote repo name) and documented.
- Primary metric, baseline, and `--replay`/`smoke` story consistent across all docs.
- README G2 section unchanged and still accurate.
- `docs/REPRODUCTION.md` still has TBD baseline/eval/output sections — must carry exact
  commands, runtime, and cost before submission (G10).
- Process hygiene clean: WORKLOG + D-0005 + CHANGELOG row all cover this change.

## Follow-up actions taken

Addressed in the same commit: dataset rule to exclude/blur other tenants' belongings +
manager-authorization scope (`docs/PROBLEM.md`); augmentation-source note on case 13;
G5 decision closed (calibration-reviewed only, no runtime checkpoint — low-harm rationale)
in PROBLEM.md and D-0005; "case" definition tightened and P1 sequence cases (S1/S2) split
out, P0 expanded to 13 single-frame cases; Iteration 1 & 2 pinned inside P0 (D-0005,
CHANGELOG); pre-submission blocker banner added to `docs/REPRODUCTION.md`.
