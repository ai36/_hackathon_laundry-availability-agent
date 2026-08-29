# Compliance review — 2026-08-29 — final packaging for judge review

**Change under review:** documentation-only packaging sweep on `dev` ahead of submission —
`README.md` stale-reference fixes; three new agent-trajectory files
(`baseline/2026-08-29-roi.md`, `runtime/2026-08-29-verification-pass-retired.md`,
`2026-08-29-integrator-corrections.md`) + `trajectories/README.md`; new `docs/VIDEO-SCRIPT.md`
and `docs/SUBMISSION.md`; `docs/WORKLOG.md` entry. No source / config / deps / data / cache /
report change.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. G2/G3/G7/G8 hold — `.env` untracked (only `.env.example` committed, matching the
SUBMISSION.md claim), no secrets in the diff (only `ANTHROPIC_API_KEY` as a var name), no
scraped/private data, no new third-party components. G9/G10 hold — every number in the new
docs traces to a committed `docs/artifacts/` report; every quick-start command is a real CLI
path.

### Risks handled

- **Compliance-run count undercounted.** `trajectories/README.md` and `SUBMISSION.md` said
  "15"; `git ls-files docs/trajectories/compliance/` returns 31 (this record makes 32).
  → Both corrected to **32**.
- **ROI "three prompt variants" sub-table cited a Harmful column for non-retained runs**,
  and the low-harmful-on-vaguest-prompt assignment contradicted
  `eval-roi-samples-2026-08-29.md` ("the higher numbers came from the vaguer prompts, which
  also raised the harmful-error rate"). → Dropped the Harmful column; labelled the sub-table
  "**not retained** … session notes, not reproducible artifacts"; kept the accuracy figures
  (40.9 / 50.0 / 54.5 — these do match the artifact) and moved the harmful-error caveat into
  prose.

### Notes (from the review)

- Headline numbers verified against `docs/artifacts/`: baseline 45.5 % / harmful 9.1 % /
  oo-recall 0-of-5; calibrated 31.8 % (−13.7 pp); ROI 40.9 % (9/22), coverage 86.4 %, 16
  calls, ~$0.022; baseline+corrections 68.2 % (+22.7 pp) / harmful 4.5 % / oo-recall 5-of-5.
- ROI per-frame verdict table checked cell-by-cell against `eval-roi-2026-08-29.json` +
  `data/labels/img_*.json` + `data/site-config.json` scope: img_1819 3/4, img_1821 1/7,
  img_1822 0/2 ("swapped" accurate), img_1823 3/6, img_8633 2/3 — all correct, totals 9/22.
- Correction flips verified: `data/corrections/` holds exactly 3 machine-scope entries
  (W-04, D-02, D-06), notes verbatim-match the table; the 5 listed baseline cells all flip to
  `out_of_order` in `eval-baseline-corrected-2026-08-29.json`. "10/17 on untouched cells" is
  arithmetically sound (baseline 10/22; all 5 corrected cells were baseline-wrong).
- Verification-pass trajectory checked against the historical reports: 62.2 % → 57.8 %
  (−4.4 pp), harmful 2.2 % → 0.0 %, coverage 95.6 % → 100 %, oo-recall 0/8 → 0/8, n=45. The
  named per-cell flips all appear in the prediction diff; "among them" correctly hedges the
  list is non-exhaustive. Full per-frame predictions preserved in
  `docs/artifacts/historical/eval-agent-2026-08-28.json`, so G9 survives the cache removal.
- `npm test` → 82/82 (README's "82" correct). `D-0016` exists (README's "D-0001 … D-0016"
  range correct). Removing the `--mode=agent --replay` quick-start line is right — `data/cache/`
  has no `agent/` dir, so it would cache-miss on the 5-frame set.
- Doc-only diff, no new measurement → no `docs/CHANGELOG.md` Progression row required; the
  existing rows (baseline, verify pass, calibrated, ROI, corrections) are what the new
  trajectory files elaborate.
