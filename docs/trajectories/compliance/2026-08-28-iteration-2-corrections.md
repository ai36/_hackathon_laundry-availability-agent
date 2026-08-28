# Compliance review — 2026-08-28 — haiku cache refresh + Iteration 2 (integrator corrections)

**Reviewer:** `hackathon-compliance` subagent (two passes — Part A cache refresh reviewed
first as `2026-...`, then the combined commit including D-0014).

**Change:** combined commit on `dev` — (A) eval cache refreshed from archived
`claude-sonnet-5` to `claude-haiku-4-5` on the committed frames; (B) config knobs
`agent.visionEffort`, `runtime.captureIntervalSeconds`; (C) **Iteration 2**: integrator-
correction store (`src/eval/corrections.ts`, `npm run correct`, `--corrections` eval flag),
3 recorded `machine`-scope corrections, D-0014.

## Verdict: PASS WITH RISKS — safe to commit and push. Risks are rigor/disclosure fixes.

### Blockers (eligibility): none
- No secrets in the diff; no new dependency; correction files carry no personal data.
- `--replay` and `--replay --corrections` reproduce all runs offline, no key (G10).
- Every headline number ties to a committed artifact under `docs/artifacts/` (G9).
- Provenance section intact; WORKLOG / DECISIONS D-0014 / CHANGELOG / `data/corrections/README.md`
  all present.

### Risks and how they were handled
1. **Circular measurement, under-disclosed.** Corrections set each cell to its label-
   consistent value → a correction scores 100% on its own cell by construction; "+13.4 pp"
   = "a human overrode 8 of 45 cells to known-correct". No repo-external evidence the 3
   machines are physically broken.
   → Added an explicit "Corrections are measured against the same labels" item to
   `docs/EVALUATION.md` limitations, and a "read the delta honestly" paragraph next to the
   figures in `README.md` and `docs/CHANGELOG.md`.
2. **Best config not evaluated.** The "shipped path" stacked corrections on the regressive
   verify pass (75.6%). `baseline + corrections` skips it.
   → Ran `npm run eval -- --mode=baseline --split=evaluation --replay --corrections` →
   **80.0%** acc, `out_of_order` 8/8. Committed `docs/artifacts/eval-baseline-corrected-2026-08-28.json`.
   Added it as the **Final (recommended)** column in the comparison tables (README,
   CHANGELOG, EVALUATION) with the deployment note: `agent.verification.enabled = false`.
3. **Asymmetric resources not called out.** Iter 2 / Final get human GT overrides the
   Baseline / Iter 1 columns don't.
   → Stated explicitly in the CHANGELOG "How to read the delta" paragraph and the EVALUATION
   limitation.
4. **Carried (Part A): no publish authorization for the 9 frames.** Unchanged by this diff;
   rests on the author's documented risk assessment (D-0009), fallback `--replay` keeps
   reproduction. Still the main G6/G7 soft spot — worth a second human sign-off before final
   submission. The project owner has stated the position in chat (shared common area, no
   authorization sought).

### Notes
- Iteration 1 recorded as an honest net-negative result (−4.4 pp), kept config-gated — good
  process.
- The docs already refuse `observation`-scope per-frame correction as "hand-labelling, not
  learning"; the same circularity caveat now also names the `machine`-scope version.
- `agent.visionEffort` / `runtime.captureIntervalSeconds` validated + unit-tested + documented.
