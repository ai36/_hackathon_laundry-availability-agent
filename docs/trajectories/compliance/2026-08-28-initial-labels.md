# Compliance review — initial ground-truth labels

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged 9 `data/labels/*.json`, roster → 16+16, splits, `MachineLabel.note`
  field, `scripts/gen-initial-labels.ts`, docs
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G7 OK (author's own assessment of their own photos, no third-party data). G8 OK
  (no secrets; label JSON is ids + states; the one `note` is "author labelled 'off' (out of
  order)"). G9 OK (CHANGELOG withholds a baseline number — "pending spot-check + `--live`").
  G10 OK (`gen-initial-labels.ts` embeds the author's raw state list, so derivation
  reproduces without the chat).

### Risks (score / process)
1. `data/splits/smoke.txt` overlaps `evaluation.txt`, contradicting D-0009 "disjoint" →
   redefine `smoke` as an explicit subset of `evaluation`, or use a non-eval frame.
2. Single labeller (author), no second pass, spot-check still open → adequate now (no
   number claimed) but the spot-check must be recorded before any baseline number, and the
   labeller's identity/qualification stated in the docs.
3. `evaluation.txt` = 9 frames vs CHANGELOG "15 P0 cases" and the rules' "10+" target
   (45 determinate observations is fine) → reconcile, or add the pending video frames.
4. `off`→`out_of_order` + `MachineLabel.note` documented only in WORKLOG + the script header
   → add a one-line amendment to D-0006 (schema decision = single source of truth).

### Notes
- Reproduced: `label:check --split=evaluation` OK; distribution 27/10/8/16 = 61 matches
  WORKLOG/CHANGELOG; typecheck/lint/tests (23/23) pass; `note?` is additive, loader accepts
  all 9. Roster W-01..W-16 + D-01..D-16 consistent (only D-01..D-10 referenced, documented).
- WORKLOG said "8 reference frames"; there are 9.

## Follow-up actions taken

Same commit: D-0009 redefines `smoke` as a subset of `evaluation` (not a separate scored
set); `docs/EVALUATION.md` gains a "Ground truth & labeller" section; D-0006 amendment adds
the `note` field + the author-vocabulary map (`busy`→`occupied`, `error`→`out_of_order`,
`off`→`out_of_order`, `unknown`→`gtDeterminate:false`); CHANGELOG "Cases" reconciled to
9 frames / 61 obs with the ≥10 target open; "8"→"9" fixed. Separately (author feedback):
`bbox` is now omitted rather than `[0,0,0,0]` — it is P1-only (ROI calibration).
