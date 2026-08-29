# Compliance review — 2026-08-29 — agent `--replay` fix

**Change under review (Commit A):** `loadSiteConfig` shape-guard + guard test + doc updates.
Files: `src/agent/pipeline.ts`, `src/agent/pipeline.test.ts`, `docs/DECISIONS.md`,
`docs/REPRODUCTION.md`, `docs/CHANGELOG.md`, `docs/WORKLOG.md`.
Explicitly **excluded**: `laundry3.config.ts` (`reservation.enabled` / `maxActivePerUser`
change — handled in its own later commit).

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G8** — diff contains no credentials/secrets. `pipeline.test.ts` writes only synthetic
  JSON to `tmpdir()`.
- **G9** — independently reproduced `npm run eval -- --mode=agent --split=evaluation
  --replay` → 57.8% / harmful 0.0% / coverage 100% / 14 calls / $0.0506, and `npm test` →
  64/64. Both match the new CHANGELOG / WORKLOG / REPRODUCTION claims.
- **G10** — this change *restores* a documented reproduction step
  (`docs/REPRODUCTION.md`) that had been broken since `d4da68e`. Net positive.
- **G7** — no new data. `data/site-config.json` holds only synthetic camera / machine ids.

### Risks (score / process) and how they were handled

1. **Partial staging / internal consistency.** `docs/CHANGELOG.md` and `docs/WORKLOG.md` had
   stale *staged* hunks (61/61, no test file) alongside newer *unstaged* hunks (64/64,
   mentions `pipeline.test.ts`).
   → **Handled:** re-`git add` the final working-tree state of all six files (plus the new
   test) immediately before committing, so the commit is internally consistent with
   `docs/REPRODUCTION.md` and the actual test file.

2. **Compliance trajectory not yet written.** `docs/WORKLOG.md` asserts "PASS WITH RISKS"
   and cites this file before it existed.
   → **Handled:** this file. Recorded verdict and risk-handling match the WORKLOG entry.

3. **Latent config collision only guarded, not resolved.** `Array.isArray(j.machines)`
   makes `loadSiteConfig` return `null` silently for any non-calibration file at
   `config.paths.siteConfig`; a future real calibration file with a missing/typo'd
   `machines` key would be silently ignored rather than erroring.
   → **Accepted for now.** The D-0015 amendment in `docs/DECISIONS.md` documents the
   deferral and warns future calibration authors not to reuse `config.paths.siteConfig`.
   A `console.warn` on the "file exists but matches neither shape" branch was *considered
   and declined*: today a camera-list file at that path is the **expected** state (the
   portal seeds it), so warning on every agent eval run would be persistent noise for a
   known, documented condition. Revisit if/when calibration gets its own path.

### Notes

- Correctly logged as a **Verification runs** CHANGELOG entry, not a Progression row — no
  metric moved. Primary-metric rows (62.2 / 57.8 / 75.6 / 80.0) unchanged and still
  evidence-backed.
- Process hygiene otherwise complete: WORKLOG entry, DECISIONS D-0015 amendment, CHANGELOG
  entry, new test with 3 guard cases, REPRODUCTION count bumped 61 → 64.
- Verification side-effect: agent replay regenerates
  `docs/artifacts/eval-agent-2026-08-29.json` (untracked, not gitignored). Deleted after the
  run — must not be `git add`-ed into the commit.
