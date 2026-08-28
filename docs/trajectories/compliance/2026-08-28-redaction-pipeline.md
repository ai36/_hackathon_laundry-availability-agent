# Compliance review — frame redaction pipeline

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged redaction step in `scripts/prepare-dataset.ts` + committed schema
  `data/redactions.example.json` + doc updates. Frames still git-ignored.
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G6/G7: no frames or raw data staged; `data/raw/redactions.json` and
  `data/public/frames/` confirmed git-ignored. Held-until-verified + authorization status
  recorded consistently across data/README, D-0009, CHANGELOG, WORKLOG, including the
  unfinished `IMG_8629-8633` group. Publish gate is a proper human checkpoint.
- None. G8: `data/redactions.example.json` has only placeholder `IMG_1234` / `IMG_5678`
  keys, coords, generic notes — no real filename, phone, email, URL, or secret.

### Risks (score / process)
1. CHANGELOG verification row listed only `npm run typecheck`, but lint/build/23 tests also
   ran → add them.
2. D-0009 was amended in place, losing the "bar changed to frame-by-frame verification"
   audit trail → use a dated addendum.
3. Reproducibility (pre-existing): `dataset:prepare` / `check:data` need the git-ignored
   `data/raw/` originals + `redactions.json`; the "45 redacted frames / 3.9 MB" WORKLOG
   claim has no committable evidence. Acceptable given the privacy constraint; watch for the
   final submission's evidence chain (G9/G10).

### Notes
- Blur-strength default inconsistent: code fallback `?? 24` + JSDoc `24` vs example/WORKLOG
  `30` → align to 30.
- `--blur-all` + the "no redactions.json → NOTHING redacted" warning are good fail-safes —
  no silent unredacted publish path.
- `data/raw/` holds exactly 16 originals (7 JPG, 4 jpeg, 5 MOV) = "16 source specs".

## Follow-up actions taken

Same commit: CHANGELOG row now lists lint/build/test; D-0009 in-place bullet restored to the
original intent and a dated **Amendment (2026-08-28)** paragraph added covering the redaction
step + raised publish bar; blur-strength default aligned to 30 in code + JSDoc + example.
Risk 3 noted for the submission evidence chain.
