# Compliance review — editable Configuration section

**Date:** 2026-08-29
**Reviewer:** `hackathon-compliance` subagent
**Change:** Make Settings → Configuration editable via a git-ignored portal-runtime
overrides layer (`src/config/overrides.ts`, `PATCH /api/config`, `config-view.tsx` form).

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G2 boundary holds:** `src/agent/*` / `src/eval/*` import the static `config` singleton
  (`src/config/resolved.ts` = `loadConfig(userConfig)`), which never reads
  `data/config-overrides.json`. Only `GET /api/config` and `src/app/integrator/page.tsx`
  call `resolvePortalConfig()`. A portal edit cannot change the submitted offline eval.
- **G4/G5:** config write to a fixed local path on the integrator-only local service
  (D-0016), fully reversible (`rm data/config-overrides.json`), merged result validated by
  `validateConfig` before write. Same trust boundary as the accepted Machines/Cameras
  editors; the route docstring keeps the "do not expose without a gate" warning.
- **G7/G8:** `data/config-overrides.json` git-ignored (`.gitignore`); no untracked `data/`
  changes; secret scan clean.
- **G10:** `docs/REPRODUCTION.md` restore command now includes `rm -f
  data/config-overrides.json` and states the eval always uses `laundry3.config.ts`.

### Risks (score / process) — all fixed before push

1. **Server-side lock not enforced** — `writeOverrides` didn't check `LOCKED_PREFIXES`; a
   direct `PATCH {"paths":{…}}` would persist. → **Fixed:** `stripLocked()` drops any
   locked group in `writeOverrides` before validate + write; covered by
   `overrides.test.ts` ("strips paths.*").
2. **`deepMerge` prototype-pollution guard** — no `__proto__` / `constructor` /
   `prototype` skip on parsed-JSON overrides. → **Fixed:** explicit `continue` on those
   keys in `src/config/load.ts`; covered by a new `load.test.ts` case.
3. **Doc/impl mismatch** — docstrings said "the portal sends only the leaves that differ
   from defaults"; `save()` sends the full non-`paths` config. → **Fixed:** route +
   `overrides.ts` docstrings reworded to describe the actual behaviour (full config sent,
   `paths.*` stripped, stored whole for a deterministic merge).

### Notes

- The runtime-write file is git-ignored, unlike sibling writes (`data/machines.json`,
  `data/corrections/`). Deliberate — keeps the eval-config boundary unambiguous — and
  documented in D-0008 + REPRODUCTION.
- `coerce("", number)` → `NaN` → `validateConfig` rejects with 400. Empty-numeric-field
  handled.
- `npm test` now 57/57 (+6: `overrides.test.ts` × 5, `deepMerge` proto guard × 1).
