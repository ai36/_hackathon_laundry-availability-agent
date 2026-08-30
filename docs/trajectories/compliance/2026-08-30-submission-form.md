# Compliance review — `docs/SUBMISSION-FORM.md` (commit 39a9dfa)

- **Agent:** `hackathon-compliance` (`.claude/agents/hackathon-compliance.md`), model sonnet.
- **Trigger:** catch-up review — commit `39a9dfa` (range `9231bb7..HEAD` on `dev`) was
  committed and pushed to `origin/dev` without a compliance pass, contrary to CLAUDE.md
  rule 2. Run before the final submission.
- **Date:** 2026-08-30.
- **Scope reviewed:** new `docs/SUBMISSION-FORM.md` (177 lines — the text pasted verbatim
  into the hackathon "Create submission" portal), `README.md` +1 doc-table row,
  `docs/WORKLOG.md` +14-line "Submission-form prep" entry.

## Verdict: PASS WITH RISKS

### BLOCKERS (eligibility)

None. Doc-only diff, no code / data / number change. Grep of the diff shows no keys, tokens,
or private data (only a `<PASTE_VIDEO_URL_HERE>` placeholder). G2 statement matches README
and `docs/SUBMISSION.md`. Every figure in the results table (45.5 / 31.8 / 40.9 / 63.6 /
68.2 / 72.7 %, harmful 9.1 / 0.0 / 9.1 / 4.5 %, coverage 100 / 100 / 86.4 / 81.8 / 100 /
86.4 %, `out_of_order` 0/5 → 3/5 → 5/5, footnote 63.6 / 59.1 / 63.6 % and harmful 4.5 /
18.2 / 4.5 %), the +18.2 pp / +22.7 pp deltas, n = 22, and test count 96 reconcile exactly
with `docs/CHANGELOG.md`, `docs/EVALUATION.md`, `docs/REPRODUCTION.md`, and
`docs/SUBMISSION.md`. The honest-caveat wording is carried over faithfully. The G10
reproduction block is the same command set as `docs/SUBMISSION.md` / `docs/REPRODUCTION.md`
(only the `synthesize` / first `baseline` line order differs — functionally equivalent).

### RISKS (score / process) — and how each was handled

1. **Stale archive SHA (Reproducibility / G9–G10).** §4 told the maintainer to upload
   `laundry3-9231bb7.zip` "built from the committed tree at HEAD `9231bb7`". Confirmed
   defect: `docs/SUBMISSION-FORM.md` does not exist at `9231bb7`, so an archive at that SHA
   would omit this submission-form doc, the README row, and the WORKLOG entry — the uploaded
   source would not match the submitted repo. It also contradicted the pre-submit checklist,
   which correctly says to rebuild from post-merge `main` HEAD.
   **Fixed:** §4 rewritten to build the archive from post-merge `main` HEAD with
   `-o laundry3-$(git rev-parse --short HEAD).zip`; dropped the hard-coded `9231bb7` and the
   unverified "~2.9 MB / 350 files" specifics (`git ls-files` at HEAD = 292 tracked files).

2. **Compliance-review count goes stale (G9 consistency).** "35" appeared in
   `docs/SUBMISSION-FORM.md:58` and `:135`, `docs/SUBMISSION.md:53`, and
   `docs/trajectories/README.md:13`. This trajectory record is the 36th.
   **Fixed:** all four bumped 35 → 36.

3. **No `docs/trajectories/compliance/` record for commit 39a9dfa (process hygiene).**
   **Fixed:** this file.

4. **WORKLOG entry missing the compliance verdict line (process hygiene).** The
   "Submission-form prep" entry was factual on content but omitted the verdict +
   risk-handling line CLAUDE.md rule 2 step 3 requires.
   **Fixed:** appended a compliance line to that entry.

### NOTES

- **Video honesty is fine.** §3 says "Not yet recorded", points at `docs/VIDEO-SCRIPT.md`,
  leaves a placeholder and an unchecked checklist box — consistent with `docs/SUBMISSION.md`
  and `docs/VIDEO-SCRIPT.md`. The video remains an open required deliverable — for the
  maintainer, not this diff.
- **Minor imprecision, checklist line ~175:** "the four `--replay` lines above print
  45.5 / 63.6 / 68.2" — the block has 4 command lines but one is `npm run synthesize`
  (prints no percentage). **Fixed:** reworded to "the three `npm run eval` lines".
- The changelog-summary chain in §2 attaches the early deltas (−4.4 pp verification pass,
  etc., measured on the retired 9-frame set) to the 45.5 % 5-frame baseline. This matches
  README's own framing and `docs/CHANGELOG.md` explains the set change, so it is internally
  consistent; left as-is.

## Follow-up actions taken

- `docs/SUBMISSION-FORM.md` — §4 archive block rewritten; two "35" → "36"; checklist
  "four `--replay` lines" → "three `npm run eval` lines".
- `docs/SUBMISSION.md:53`, `docs/trajectories/README.md:13` — "35" → "36".
- `docs/WORKLOG.md` — compliance line appended to the 2026-08-30 "Submission-form prep" entry.
- Committed and pushed to `origin/dev`.
