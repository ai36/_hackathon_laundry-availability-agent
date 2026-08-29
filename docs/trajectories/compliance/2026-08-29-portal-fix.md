# Compliance review — 2026-08-29 — portal fix + `/api/refresh` realignment

**Change under review:** repoint `buildRoomStatus`'s default report, revert `/api/refresh`
from `cameraClassifyPrompt` to `baselinePrompt`, relabel the Cameras-editor copy, sync
README + REPRODUCTION. 5 files, ~200 lines. No eval code / artifact / data changes.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. No secrets in the diff; no data / license / scope change.

- **G10 is improved.** The change fixes a real regression: `/tenant`, `/integrator*`, and
  every `/api/*` route 500'd on `readFileSync` of `docs/artifacts/eval-baseline-2026-08-28.json`,
  which `9a99250` moved to `historical/`. New default `eval-baseline-2026-08-29.json` exists
  and is the like-for-like raw baseline report.
- **G9 is improved.** Reverting the key-optional live demo to `baselinePrompt` — the prompt
  that was actually scored — removes a divergence between the demo and the evidence. The
  eval scored calibrated-images at −13.7 pp (dead-end) and frozen ROI at −4.6 pp; the
  claimed config is "baseline + corrections" (68.2%). D-0015 already frames the portal as "a
  live operator tool, not a scored claim". `--mode=calibrated` / `--mode=roi` and all
  committed numbers are untouched and still reproduce.

### Risks (process / doc-consistency) and how they were handled

1. **No WORKLOG entry.** → Added, with the verification results and this verdict.
2. **`docs/DECISIONS.md` D-0015 contradicts the code** — the "calibration inputs are now
   consumed by the runtime prompt" amendment said `/api/refresh` "no longer sends
   `baselinePrompt`". → Marked that amendment superseded and added a reversion amendment
   (calibrated = dead-end, `camera.mask` is now a region map, live path realigned to the
   scored baseline; plus the `buildRoomStatus` report repoint).
3. **`docs/CHANGELOG.md` "Verification runs" entry stale** — the `2026-08-29 — /api/refresh
   camera-aware prompt` entry described `cameraClassifyPrompt` replacing `baselinePrompt` as
   current. → Added a "Reverted 2026-08-29 (later)" blockquote at the top of that entry,
   tied to the eval findings.
4. **README G9 precision** — the edited line juxtaposed the 45.5% raw-baseline artifact with
   the 68.2% figure without citing `eval-baseline-corrected-2026-08-29.json`. → Rewrote to
   name both artifacts and the 3 committed corrections.
5. **README `promptFragment` wording** (~line 133) — said the fragment is one "the agent
   gets"; `/api/refresh` no longer folds it in. → Tightened to "the calibrated eval mode
   uses".
6. **`data/corrections/` unchanged?** → Confirmed: exactly `W-04` / `D-02` / `D-06`,
   `machine`-scope, no diff vs HEAD.
7. **Save this review + record handling in WORKLOG.** → This file; WORKLOG updated.

### Notes

- `refresh-control.tsx` never read the removed `refs` field — no client breakage (confirmed
  by the reviewer).
- Verification: `typecheck` / `lint` / `format:check` / `npm test` 82-82 / `check:data` /
  `build` pass; `npm start` route checks: `/` 307, `/tenant` `/integrator`
  `/integrator/settings` `/api/room` → 200.
