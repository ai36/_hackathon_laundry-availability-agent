# Compliance review — 2026-08-30 — Iteration 3: correction → `promptFragment` feedback loop

**Change under review:** `src/eval/prompt-synthesis.ts` + `scripts/synthesize.ts` (`npm run
synthesize`); `runRoi` `fragments` param + `run-eval --fragments` (ROI only, separate cache
+ report); `RosterMachine.fragmentSource`; `parse.ts` `extractJsonObject` exported; 3
synthesised `promptFragment`s in `data/machines.json`; new artifacts
`eval-roi-fragments{,-corrected}-2026-08-30.json` + samples doc; caches
`data/cache/{synthesis,roi-fragments}/` (force-added); doc updates across README / CHANGELOG
/ DECISIONS / REPRODUCTION / SUBMISSION / trajectories / WORKLOG; deadline corrected to
2026-08-31 11:00 America/Los_Angeles.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G2** — Iteration 3 is clearly delimited (WORKLOG 2026-08-30, CHANGELOG Iteration-3 row,
  D-0014 "Status (2026-08-30)", new trajectory).
- **G3** — no new dependency; `package.json` adds only the `synthesize` script line, `sharp`
  was already a devDependency.
- **G4 / G5** — `synthesize` only writes a repo file, is behind a mandatory backend flag,
  `--fragments` is opt-in, fragments are advisory prompt text (not auto-overrides), and the
  trigger is deliberately not wired into `/api/corrections` (documented).
- **G7 / G8** — no new data; the synthesised fragments + both new cache dirs (19 JSONs)
  contain only model text about machine displays — no PII, no keys/tokens.
- **G9** — the subagent re-derived every headline number from the committed artifacts +
  `data/labels/` + `data/corrections/`: ROI + fragments 63.6 % / harmful 4.5 % / coverage
  81.8 % / oo 3/5; corrected 72.7 % / oo 5/5; the 5-fixed / 0-broken per-cell table
  (W-04@img_1819 in-sample; D-02@img_1822 + D-06@img_1823 transfer; D-01@img_1822 +
  D-05@img_1823 spillover; excl. in-sample 13/22 = 59.1 %) — all exact. Plain
  `data/cache/{baseline,roi}/` and their reports are not in the diff, so
  baseline / ROI / corrections numbers are structurally untouched.
- **G10** — `npm run synthesize -- --replay` + `npm run eval -- --mode=roi --replay
  --fragments [--corrections]` are key-free from committed cache; REPRODUCTION updated with
  commands, expected output, cost, and the idempotent-rewrite note.

### Risks handled (fixed before push)

- **Coverage-cell mismatch (G9).** The "ROI + frag. + corr." column showed coverage
  81.8 % / 82 % in README + CHANGELOG + the trajectory, but
  `eval-roi-fragments-corrected-2026-08-30.json` reports `coverage: 0.8636` (86.4 %) — the
  correction promotes `D-06`@img_1821 from `unknown` to covered. → all three cells corrected
  to **86.4 %** (`accuracyOnCovered` 84.2 % was already right).
- **Samples 2–3 not reproducible (G9).** Only sample 1 has a committed cache. → the samples
  doc now labels samples 2–3 "not committed — author-attested `--live` re-run" and states
  the noisy-harmful-error caveat rests on them.
- **"Held-out" is spatial, not temporal.** All 5 frames are one capture session. → every
  "held-out" mention (README, CHANGELOG ×3, trajectory, samples doc) now says *spatial, not
  temporal* adjacent to the claim, and repeats that a re-shoot is the remaining step.

### Notes

- "First automated configuration to beat the baseline" is honestly qualified everywhere — all
  3 re-run samples (59.1–63.6 %) clear baseline 45.5 %, oo recall stable 3/5, and the
  n=22 / one-committed-sample / all-corrections-`out_of_order` / in-sample-cell / harmful-noise
  caveats appear in README, CHANGELOG, DECISIONS, the trajectory, and the samples doc.
- `RosterMachine.fragmentSource` is provenance-only, not read by the agent (noted in
  `src/eval/roster.ts`).
- Subagent could not execute `npm test` / `--replay`; the 89/89 and "replays unchanged"
  claims rest on the untouched plain-cache artifacts, consistent with the diff. Verified
  locally: `typecheck` / `lint` / `format:check` / `build` / `check:data` pass, `npm test`
  89/89, `--replay` reproduces 45.5 / 40.9 / 63.6 %.
