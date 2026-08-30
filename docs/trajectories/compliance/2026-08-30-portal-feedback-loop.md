# Compliance review — 2026-08-30 — feedback loop wired into the portal

**Change under review:** `synthesizeForCorrection` / `baselinePredictionFor` (shared helper,
`src/eval/prompt-synthesis.ts`); `POST /api/corrections` runs it on a `machine`-scope
correction when `ANTHROPIC_API_KEY` is set and writes the `promptFragment`; `/api/refresh`
folds every `promptFragment` into `baselinePrompt` + the live cache key; `baselinePrompt`
gains an optional `fragments` arg; `scripts/synthesize.ts` refactored onto the helper +
`--replay` idempotency bug fix; +7 tests (96/96); doc updates.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G9** — the 63.6 % stays offline-only. `runBaseline` calls `baselinePrompt(machineIds)`
  with no fragments; the new optional `fragments` arg has exactly one caller
  (`/api/refresh`). No eval file changed. `npm test` 96/96.
- **G10** — judge key-free path intact. `runFeedbackLoop` returns
  `{skipped:"no ANTHROPIC_API_KEY"}` before any file op; `/api/refresh` builds the fragments
  map but only consumes it inside `if (haveKey)`. `npm run synthesize -- --replay` leaves
  `data/` clean (byte-for-byte reproduction — the idempotency fix works).
- **Rule 9** — the prior commit's false "reproduces via `--replay`" claim for the synthesis
  step is explicitly retracted and corrected in CHANGELOG (2026-08-30 entry), WORKLOG, and
  D-0014's 2026-08-30 amendment.
- **Rule 4** — synthesis fires only as a direct consequence of the integrator's explicit
  "durable correction → save", is key-gated, sub-cent, non-fatal on failure, and the produced
  rule is echoed in the response. Tenant-facing state stays behind authoritative human
  corrections.
- **G2 / G3 / G8** — additive competition work, logged; no dependency change; no secrets
  (`ANTHROPIC_API_KEY` via the existing `process.env` pattern, nothing logged).

### Risks handled (fixed before push)

- **README "Honest gap" could be misread** as the portal path being measured end-to-end. →
  reworded: the portal loop is *operable* but not separately measured; the 63.6 % is the
  offline `--replay` chain only; the temporal / held-out set is the remaining step. (The
  other four docs already said this.)
- **`npm run synthesize -- --replay` printed `cost $0.0065 (replay)`** — a recorded, not
  incurred, cost. → now prints `$0 (recorded live cost was $0.0065)` on `--replay`, `$0
  (fake)` on `--fake`.
- **Rule 4 disclosure (minor)** — the learned rule changes `/api/refresh` recognition with no
  described undo. → route header comment + REPRODUCTION now note it is advisory (corrections
  stay authoritative) and revertible via `git checkout -- data/machines.json` or the Machines
  editor.

### Notes (accepted, not fixed)

- `/api/refresh` now calls `loadRoster()` unguarded on the key-free path — a malformed
  `data/machines.json` would 500 the endpoint. Consistent with the pre-existing unguarded
  `loadSiteConfig()` in the same route and covered by `npm run check:data`. Low severity.
- The Improvement Changelog Iteration-3 row was re-read in context: it credits
  `npm run synthesize` + `npm run eval -- --mode=roi --fragments` (the offline chain), not the
  portal wiring. Correct.
