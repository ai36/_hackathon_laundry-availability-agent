# Compliance review — button-label consistency + no dev ids in UI copy

**Date:** 2026-08-29
**Reviewer:** `hackathon-compliance` subagent
**Change:** 4 presentational portal changes from `docs/BACKLOG.md` (`machine-card.tsx`,
`cameras-editor.tsx`, `machines-editor.tsx`, `integrator-view.tsx`) + docs + regenerated
screenshots.

- Mark-wrong panel: instant-submit state buttons → state selection + `save` + icon
  `cancel`.
- Camera per-image `remove` → icon-only; camera / machine delete → icon + "remove".
- Camera field labels + panel intro reworded — no `D-0015` / `D-0016` /
  `StaticImageFrameSource` / `data/site-config/…` in visible copy.
- `(D-0014)` removed from the Integrator info box.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. UI strings + docs only; no secrets, no data/scraping, no deps. Human-approval
checkpoints are intact and in fact **strengthened**: the mark-wrong panel now needs an
explicit `save` before `POST /api/corrections` (was firing on the first state-button
click); the `confirm()` delete gates are unchanged. `/api/corrections` payload unchanged.
No results claims (G9), reproduction path (G10), or before/after framing (G2) touched.

### Risks (score / process) — and how they were handled

1. **DECISIONS hygiene** — `machine-card.tsx` changes the correction-submission interaction
   (instant-submit → select-then-`save`), a small design decision in D-0014's area. It was
   in WORKLOG but not D-0014. → **Fixed:** added a dated one-line amendment to D-0014 in
   `docs/DECISIONS.md` noting the panel now commits only on explicit `save`.

### Notes

- WORKLOG / CHANGELOG / BACKLOG all updated; CHANGELOG row correctly under
  verification-runs, labelled "presentational only".
- `portal-{machines,settings}.jpg` regenerated to match the shipped UI.
- `ICON_BUTTON` import cleanup consistent (still used in `cameras-editor.tsx`, removed from
  `machines-editor.tsx`).
- Decision ids + `StaticImageFrameSource` removed only from user-visible strings, kept in
  comments/docs; reworded labels remain accurate. Frame ids (`img_1819`) in the provenance
  line are real dataset provenance, kept.
