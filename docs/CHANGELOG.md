# Improvement Changelog

The story of how this solution evolved, per the hackathon brief. Start from the simple
baseline, add one entry per meaningful experiment, tie each to evidence, and record the
decision it led to. Include experiments that were later removed and what they taught us.

## Evaluation method

- **Primary metric:** overall per-machine state accuracy (free vs occupied) on a labelled
  laundry-room frame set. Secondary: tokens / cost per frame. Full plan in
  `docs/EVALUATION.md`.
- **Cases:** 10+ (frame, expected per-machine status) pairs spanning machine × state ×
  condition, including a hard "person in frame" case.
- **Baseline:** single Claude vision prompt on the whole frame (same metric, same frames);
  contextual baseline = the manual "walk over and check" process.
- **Harness:** offline scoring script with a `--replay` mode (re-scores from cached model
  responses, no API key). Exact command TBD once the harness exists.

## Progression

| Stage | What we tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Setup | Bootstrapped project infra: Next.js 16 + TS + Tailwind v4 + MobX, skills `find-skills` + `grillme`, docs/logging scaffold. Not an iteration on the solution — the starting line. | `npm run typecheck` / `lint` / `build` results below | Infra in place; next step is to define the problem and build the baseline. |
| Scoping | Ran the `grillme` Socratic-interview skill to turn "laundry3" into a defined problem, user, MVP, metric, baseline, dataset plan, and phased scope. | `docs/PROBLEM.md`, `docs/EVALUATION.md`, D-0005 | Problem pinned: per-machine free/occupied status from laundry-room frames; core = agent → verified status list. |
| Baseline | _TBD — single Claude vision prompt on the whole frame, scored on per-machine accuracy over the labelled eval frames._ | _[baseline result]_ | _Establishes the starting point for the measured improvement._ |
| Iteration 1 (P0) | _TBD — per-machine ROI calibration config from human-confirmed frames._ | _[new result]_ | _[kept / revised / removed]_ |
| Iteration 2 (P0) | _TBD — explicit verification pass for low-confidence machines._ | _[new result]_ | _[kept / revised / removed]_ |
| Iteration 3 (P1) | _TBD — temporal memory / change-detection._ | _[new result]_ | _[kept / revised / removed]_ |
| Final | _TBD — combine what worked._ | _[final result]_ | _Main contribution: …_ |

## Baseline vs. final comparison

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Primary outcome | _[value]_ | _[value]_ | _[change]_ |
| Human time per task | _[value]_ | _[value]_ | _[change]_ |
| Cost per task | _[value]_ | _[value]_ | _[change]_ |

## Verification runs

Record the result of each infra verification here (append, newest first).

### 2026-08-28 — infra bootstrap

- `npm run typecheck` — **pass**, no errors.
- `npm run lint` — **pass** after one fix: `react-hooks/refs` flagged reading
  `storeRef.current` during render in `store-provider.tsx`; switched the lazy store init
  from `useRef` to `useState(() => initRootStore(...))` (stable instance, no re-renders).
- `npm run format:check` — **pass** (`prettier --check .`).
- `npm run build` — **pass**, Next.js 16.3.3 (Turbopack), routes `/` and `/_not-found`
  prerendered as static content. Wall time ~5 s.
- Raw logs: `docs/artifacts/verification-2026-08-28.txt`, `docs/artifacts/build-2026-08-28.txt`.
- `node .claude/hooks/git-guard.test.mjs` — **8/8 pass** (branch-protection hook).
- Hackathon-compliance review (independent agent): **PASS WITH RISKS**, no blockers; risks
  addressed in the 2026-08-28 worklog entry.
