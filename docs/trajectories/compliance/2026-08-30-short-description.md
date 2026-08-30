# Compliance review — `## 2-ALT` short Description in `docs/SUBMISSION-FORM.md`

- **Agent:** `hackathon-compliance` (`.claude/agents/hackathon-compliance.md`), model sonnet.
- **Trigger:** new condensed Description variant for a 10 000-char submission field
  (HackerEarth). Staged, not yet committed.
- **Date:** 2026-08-30.
- **Scope reviewed:** `git diff --staged` on `dev` — new `## 2-ALT` section (~6.5 KB) +
  `docs/WORKLOG.md` entry.

## Verdict: PASS WITH RISKS → risk fixed

### BLOCKERS (eligibility)

None. Prose-only diff, no secrets / keys / PII. G2 provenance line preserved. The reproduce
block is key-free and cost-free.

### RISK — and how it was handled

**G9 / judge-facing accuracy — stale compliance-review count.** The docs said "37 recorded
reviews / 37 compliance reviews / (37 runs) / 37 files" while `git ls-files
docs/trajectories/compliance/` was already 38 (39 with this record). The number had been
corrected four times this session (33 → 35 → 36 → 37) and kept re-staling.
**Fixed durably — removed the number** in all six places rather than re-bumping it:
- `docs/SUBMISSION-FORM.md` ×4 → "one recorded review per meaningful change under
  `docs/trajectories/compliance/`" / "the compliance-review log".
- `docs/SUBMISSION.md:57` → "(one per meaningful change)".
- `docs/trajectories/README.md:13` → "one per meaningful change".

Also, for consistency (reviewer NOTE): added `docs/LIMITATIONS.md` to the full section-2
"What's in the zip" list — the new 2-ALT already had it.

### NOTES (reviewer, no fix needed)

- All numbers in 2-ALT audited and consistent with full section 2 / `docs/REPRODUCTION.md` /
  `docs/CHANGELOG.md`: results table (45.5 / 31.8 / 40.9 / 63.6 / 68.2 / 72.7 %; harmful
  9.1 / 0.0 / 9.1 / 4.5; coverage 100 / 100 / 86.4 / 81.8 / 100 / 86.4; oo 0/5→3/5→5/5),
  footnote (63.6 / 59.1 / 63.6 % and 4.5 / 18.2 / 4.5 %), changelog chain
  (−4.4 / −13.7 / −4.6 / +22.7 pp → 63.6 %), "+18.2 pp single-vs-single", the four
  reproduce commands.
- Honest-caveat paragraph retains every required element: n=22, one committed loop sample,
  baseline not re-sampled, all 3 corrections `out_of_order`, 1 of 5 fixes in-sample, only 2
  genuine cross-machine spillover, needs a temporal / held-out set, override "does not
  generalise". Scoping words ("first *automated* configuration to clear the baseline **on
  this 5-frame set**") stay bounded. No new over-claim from the shorter phrasing.
- Minor trims that do not weaken substance: "(cue-consistency)" label dropped but the 2
  non-spillover fixes still described as "the same broken unit on a different frame"; the
  footnote drops "`out_of_order` 3/5 all three" (a favourable detail); "3/3 loop runs above
  baseline" parenthetical dropped while "all 3 loop samples beat 45.5 %" remains.
- Char-count annotations ("≈ 6 540" / "≈ 7 340") measured close (~6.5 K / ~7.4 K by
  character); both well under 10 000. Not a compliance concern.
- Process: WORKLOG entry present and consistent. No DECISIONS / CHANGELOG row needed —
  condensed restatement of approved text, no new decision or measured result.

## Follow-up actions taken

- Stale compliance-count removed in `docs/SUBMISSION-FORM.md` (×4), `docs/SUBMISSION.md`,
  `docs/trajectories/README.md`.
- `docs/LIMITATIONS.md` added to the section-2 zip-contents list.
- `docs/WORKLOG.md` — verdict recorded.
- Committed and pushed to `origin/dev`.
