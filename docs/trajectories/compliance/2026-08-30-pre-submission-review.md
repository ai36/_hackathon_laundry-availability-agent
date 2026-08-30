# Compliance review — 2026-08-30 — full pre-submission pass (collegial)

**Scope:** the whole project state on `dev` (HEAD 23adc13), not a diff — the final compliance
pass before the maintainer merges `dev → main` and submits (deadline 2026-08-31 11:00
America/Los_Angeles). Run as a two-party review: Claude Code did an independent pass, the
`hackathon-compliance` subagent did an independent pass, then the two reconciled into this
joint list.

## Verdict: PASS WITH RISKS — no blockers

Both reviewers concur. Nothing on the list is CHANGES-REQUIRED; nothing blocks eligibility.
All fixes are in-repo doc edits except the video (maintainer action, represented honestly as
script-only). Every headline number was independently re-derived offline, key-free, from
committed state and matched `docs/artifacts/eval-*.json` exactly: baseline 45.5 %, calibrated
31.8 %, ROI 40.9 %, ROI + fragments 63.6 %, baseline + corrections 68.2 %, ROI + fragments +
corrections 72.7 %, ex-in-sample 13/22 = 59.1 %. `npm test` 96/96. `check:data` passes.
`npm run synthesize -- --replay` is idempotent (tree stays clean).

### Convergence

Claude Code independently flagged: the stale test count, the two-different-63.6 % collision,
the video-is-script-only gap, and the "first automated config" headline composition. The
subagent's pass was the superset — it additionally caught the stale `docs/EVALUATION.md`
(no Iteration 3), the absence of a pre-registered success bar, the missing WORKLOG entry for
commit 23adc13, the stale compliance-run count, and a duplicated sentence at README:71-72.
All four Claude-Code re-verified as real.

### Risks and how each was handled (fix list A–J)

| ID | Risk | Fix applied |
| --- | --- | --- |
| A | `README.md` + `docs/REPRODUCTION.md` say `npm test` 89 / "89/89"; actual 96. | Updated to 96. Point-in-time historical records (CHANGELOG verification-run bullet, prior compliance files) left as-was — true when written. |
| B | `README.md:71-72` — a sentence duplicated back-to-back (copy-paste artifact in the primary deliverable). | Deleted the second copy. |
| C | `docs/EVALUATION.md` — a core deliverable doc ("Metric, cases, rubric, recorded results") with **no Iteration 3** and a colliding "63.6 %" (its own = ROI + corrections). | Added an "Iteration 3" sub-section (same cases / metric, the fragments result + honest limits), a summary table in "Results", and a "What a good final result means" section (item E). Disambiguated the ROI + corrections 63.6 %. |
| D | `docs/SUBMISSION.md` — the "start here" doc carried "+18.2 pp / automated win" with no caveat, and "(33 runs)". | Added a "Read the feedback-loop result honestly" paragraph + cross-refs; trajectory-table label softened; count → 35. |
| E | "first automated configuration to beat the baseline" over-reads: the +18.2 pp is single-vs-single (baseline not re-sampled), and of the 5 fixes vs plain ROI, 1 is in-sample and 2 (`D-02`/`D-06`) are the same broken unit showing the same cue on a different frame — cue-consistency, not open-ended generalisation; only `D-01`/`D-05` are genuine spillover. | Headline reworded to "the first automated configuration to **clear the baseline on this set**" everywhere it stands alone (`README`, `CHANGELOG` ×4, `DECISIONS`, `SUBMISSION`, the trajectory, the samples doc). Added, next to each +18.2 pp, "one committed loop sample vs one baseline sample — the baseline was not re-sampled; robustness is 3/3 loop runs above baseline". "same-machine transfer to an unseen frame" → "the same broken unit / same cue on a frame the rule was not derived from (cue-consistency)". Also fixed a stray "+18.2 pp over plain ROI" (should be over baseline) in the samples doc. |
| F | No pre-registered success bar (rubric asks to define "a good final result" before running). | `docs/EVALUATION.md` now states the bar plainly: a **qualitative direction** fixed before the runs — accuracy above baseline **and** harmful-error not increased, bonus for `out_of_order` recall off zero; harmful-error priority is the tie-breaker. No retrofitted numeric threshold. |
| G | `README` Quick start + `SUBMISSION` one-minute repro run `--mode=roi --replay --fragments` with no preceding `synthesize --replay`; works only because the 3 fragments are committed. | Both now note the rules are already in `data/machines.json` and `synthesize --replay` regenerates them; `SUBMISSION` adds the `synthesize` line to the block. |
| H | `--replay` writes `eval-<mode>-<run-date>.json` — a judge running it today gets a new untracked file, not an in-place regeneration; `REPRODUCTION` said "regenerates byte-identically". | `REPRODUCTION` now explains the filename carries the run date; compare JSON bodies, not filenames; delete the new file for a clean tree. |
| I | `docs/trajectories/README.md` compliance count 33. | → 35 (34 existing + this file). |
| J | HEAD commit 23adc13 (VIDEO-SCRIPT rewrite) had no `docs/WORKLOG.md` entry and no compliance record. | This file + a `docs/WORKLOG.md` entry covering 23adc13 and this pass. |

### Accepted as-is (no fix)

- **Deliverable #3 (solution video)** is a script only (`docs/VIDEO-SCRIPT.md`). `SUBMISSION.md`
  frames it honestly ("recording submitted separately per the hackathon form"). The script
  content is consistent with current results (loop built + measured + portal-wired, no
  "designed, not implemented" language). The maintainer must record and submit it before the
  deadline — a submission-readiness item, not an in-repo compliance fix.
- **Harmful-error 4.5 %** for ROI + fragments is the committed/favourable sample; mean across
  3 samples ≈ 9 % (one run 18.2 %). Disclosed by the ¹ footnote adjacent to every occurrence
  and by the samples doc (samples 1 and 3 both 4.5 %, so not cherry-picked). Kept — the
  footnote travels with the figure.
- **Branch:** everything on `dev`; the maintainer merges to `main` manually. Flagged in
  `SUBMISSION.md` "Repository access".

### Ground rules

G1–G10 all satisfied. No new-dependency, secret, PII, or unsandboxed-action risk introduced
by the feedback loop or the portal wiring (synthesis is key-gated, integrator-triggered,
non-fatal, advisory, revertible; frames redacted; `.env` git-ignored; `check:data` +
pre-commit hook).
