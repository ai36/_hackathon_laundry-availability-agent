# Compliance review — calibrated-replay reproducibility fix (freeze + cache re-index)

- **Agent:** `hackathon-compliance` (`.claude/agents/hackathon-compliance.md`), model sonnet.
- **Trigger:** a judge-simulation from the submission zip (clean directory, no API key,
  in-archive instructions only) found `--mode=calibrated --replay` cache-missing while
  README / SUBMISSION / REPRODUCTION / LIMITATIONS claim 31.8 % reproduces. Code + cache
  fix staged; reviewed before commit.
- **Date:** 2026-08-30.
- **Scope reviewed:** `git diff --staged` on `dev` — `src/agent/calibrated.ts` (freeze),
  `src/agent/camera-classify.ts` (docstring), 5 renames in `data/cache/calibrated/`,
  README / REPRODUCTION / SUBMISSION / SUBMISSION-FORM hooksPath caveat, D-0015 amendment,
  WORKLOG.

## Verdict: PASS WITH RISKS → both risks addressed

### BLOCKERS (eligibility)

None. G10 is materially **improved**: the calibrated replay was cache-missing for any judge
and is now reproducible. G8 clean (docs / comments / renames only). G7 / G9 clean — no new
data; the −13.7 pp claim's evidence is unchanged and now actually replays.

### Root causes (confirmed by the reviewer in code)

1. `runCalibrated` folded roster `promptFragment`s into its prompt — the 3 rules
   `npm run synthesize` committed 2026-08-30 changed the request hash out from under the
   cache recorded 2026-08-29 (empty roster then).
2. `assetPath` absolutised `extraImagePaths` via `process.cwd()` and `requestHash` hashes
   those strings — the committed cache could only hit from the exact recording directory.
   Broken for any judge since 2026-08-29; the "reproduced byte-for-byte" reviews all ran in
   that directory.

### RISKS — and how each was handled

1. **Latent recurrence: the hash is still `existsSync`-conditioned** — deleting the
   committed calibration assets would flip the `has*` flags / refs list and silently change
   the hash again. Reviewer offered two fixes: derive from config strings, or add a
   regression test pinning the hashes.
   **Handled with the pin test** (the config-string change would invert the existing
   deliberate "drops missing asset files" test — which guards live-call coherence: the
   prompt must not promise images that were not attached — and change live semantics hours
   before the deadline). New test in `calibrated.test.ts`: for every evaluation frame,
   rebuild the exact request against committed site-config / labels / assets and assert its
   `requestHash` resolves to a committed `data/cache/calibrated/` file, the extra image
   paths are relative, and the prompt carries no "Per-machine notes". Any silent hash drift
   is now a loud test failure.
2. **No test guarded the freeze** (fragment-folding could be re-introduced).
   **Handled by the same pin test** on real repo data: the roster HAS fragments for scoped
   machines (C-01 scopes W-04), so re-introducing fragment-folding changes C-01's prompt →
   hash mismatch → failure; plus an explicit "no Per-machine notes" assertion.

### Reviewer verification (independent)

- Freeze is honest: the −13.7 pp run was recorded with an empty roster; no user-facing doc
  claims the measured calibrated run used fragments (CHANGELOG / EVALUATION describe it as
  "annotated shot + mask as extra vision inputs" only). The stale claim lived in the old
  `calibrated.ts` docstring, now corrected.
- Cache renames are pure: `git diff --staged --raw` shows identical blob SHAs on both sides
  of all 5 (R100, 0 insertions / 0 deletions). Re-indexing, not re-recording.
- **No other mode hashes environment-dependent strings**: `runBaseline`, `runRoi`,
  `synthesizeFragment` pass no `extraImagePaths` (the refs branch of `requestHash` is never
  taken); `roi` folds only numeric crop coords; `imagePath` is never hashed; `roi.ts` uses
  `process.cwd()` only for mask loading, not in hashes. Consistent with the judge-sim where
  those modes replayed fine cross-directory.
- Reproduced locally: calibrated `--replay` → **31.8 %**, `--corrections` → **54.5 %**;
  report body matches `eval-calibrated-2026-08-29.json` key-for-key. typecheck / lint /
  tests pass.
- SUBMISSION-FORM "every row reproduces from `--replay`" and LIMITATIONS "a clean checkout
  reproduces every number" were inaccurate pre-fix and are now true. VIDEO-SCRIPT
  references calibration only conceptually — unaffected.
- hooksPath caveat ("git checkout only — skip if you unpacked the zip") correct.
- No CHANGELOG row needed (no measured number changed) — matches the 2026-08-29
  agent-replay-fix precedent. WORKLOG + D-0015 amendment present.

## Follow-up actions taken

- Pin test added (`src/agent/calibrated.test.ts`) → `npm test` **97/97**; test-count refs
  bumped 96 → 97 in README / SUBMISSION / SUBMISSION-FORM (×2) / REPRODUCTION.
- WORKLOG entry updated with the risk handling; this trajectory file saved.
- Committed and pushed to `origin/dev`; submission archive rebuilt and the judge simulation
  re-run from the new zip.
