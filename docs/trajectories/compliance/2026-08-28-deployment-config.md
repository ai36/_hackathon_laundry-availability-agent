# Compliance review — deployment config module

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged deployment-config module — `laundry3.config.ts` + `src/config/*` +
  `docs/CONFIGURATION.md` + D-0008 + `tsx` devDep + `npm test`
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G3: `tsx ^4.23.12` is MIT, devDependencies-only. G8: no keys/secrets;
  `agent.visionModel: "claude-sonnet-5"` is a model id, not a credential; `.gitignore` adds
  `/laundry3.config.local.ts`. G4/G5: config adds no real-world side effect —
  `reservation.*` stays advisory/simulated (D-0007), `maxReservedFractionOfFree` tightens
  the guard rail, no notification channel is configurable. G7: no data; `npm run check:data`
  passes. G2: README intact. G9: the "8/8 pass" verification row matched the tests.

### Risks (score / process)
1. `docs/REPRODUCTION.md` "Checks" section not updated with `npm test`; runtime/cost table
   doesn't note `tsx` → add both.
2. `reservation.enabled` defaults `true` while reservations are P2/unbuilt (vs
   `changeDetection.enabled: false`) → default it `false` or add a note.

### Notes
- `docs/CONFIGURATION.md`, `src/config/types.ts`, `src/config/defaults.ts` field-for-field
  consistent across all seven groups; D-0008 accurately describes the implementation.
- Config values align with prior scope docs (holdMinutes 5, maxActivePerUser 1,
  reconcileOnExpiry, paths.siteConfig, portal flags).
- WORKLOG + D-0008 + CHANGELOG updated — process hygiene satisfied.

## Follow-up actions taken

Same commit: `docs/REPRODUCTION.md` Checks section + runtime table updated;
`reservation.enabled` default → `false` with a note in `docs/CONFIGURATION.md` and D-0008
that P2 defaults are off and the other `reservation.*` values are the intended production
settings. Plus (user feedback, same commit): `site.machineCount` → `site.machines.{washers,
dryers}` (non-negative ints, total ≥ 1); tests updated to 10/10.
