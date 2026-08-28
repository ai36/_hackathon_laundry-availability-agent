# Compliance review — 3-way state + label schema + data/ scaffold

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged docs/config change — `free`/`occupied`/`unknown` state space,
  per-observation conditions, JSON label schema, metrics rework (harmful-error + coverage),
  14 P0 cases, D-0006, `data/` scaffold + `.gitignore` rules
- **Input:** `git diff --staged` (docs + config only; no code, no dataset)
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. No dataset, frames, secrets, or scraped content introduced. G8 grep clean. Missing
  baseline/eval numbers expected at this stage.

### Risks (score / process)
1. Privacy scaffold is visual-only — no rule about stripping embedded image metadata; phone
   frames carry EXIF GPS / device serial / timestamps → add an explicit strip rule.
2. Enforcement is policy-only — committed paths under `data/` protected by prose, no gate →
   add a pre-commit / hook check for EXIF + disallowed paths.
3. D-0005 still shows the binary metric as "Accepted" with no pointer to D-0006.
4. `docs/CHANGELOG.md` says `lights_off`; schema uses `lights_off_no_motion` — align.
5. `docs/PROBLEM.md` four-questions summary still says "free/occupied accuracy", no mention
   of `unknown` / abstention / harmful-error.

### Notes
- Internal consistency otherwise good — enum, primary metric, secondary metrics, and case
  count (14 P0 + 2 P1) match across PROBLEM / EVALUATION / DECISIONS D-0006 / CHANGELOG /
  WORKLOG.
- Process hygiene satisfied (WORKLOG + D-0006 + CHANGELOG method section).
- Adding `unknown` + harmful-error metric strengthens the G4/G5/G6 posture (rewards
  abstaining over asserting a false "free").

## Follow-up actions taken

Same commit: metadata-strip rule in `data/README.md`; `scripts/check-data-privacy.mjs` +
`npm run check:data` + committed `.githooks/pre-commit` (dependency-free gate — rejects
`data/raw//data/frames/` paths, images outside `data/public/`, and EXIF/XMP/IPTC/PNG-text
metadata; tested); D-0005 "superseded by D-0006" note; `lights_off_no_motion` token aligned;
four-questions summary updated; `git config core.hooksPath .githooks` added to
`docs/REPRODUCTION.md`.
