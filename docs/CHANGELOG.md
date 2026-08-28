# Improvement Changelog

The story of how this solution evolved, per the hackathon brief. Start from the simple
baseline, add one entry per meaningful experiment, tie each to evidence, and record the
decision it led to. Include experiments that were later removed and what they taught us.

## Evaluation method

- **Primary metric:** _TBD — the one number that reflects success for the intended user
  (see `docs/PROBLEM.md`)._
- **Cases:** _TBD — 10+ shared cases, same for baseline and final, including one hard case._
- **Harness:** _TBD — exact command in `docs/EVALUATION.md`._

## Progression

| Stage | What we tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Setup | Bootstrapped project infra: Next.js 16 + TS + Tailwind v4 + MobX, skills `find-skills` + `grillme`, docs/logging scaffold. Not an iteration on the solution — the starting line. | `npm run typecheck` / `lint` / `build` results below | Infra in place; next step is to define the problem and build the baseline. |
| Baseline | _TBD — the reasonable basic way to handle the task (one direct prompt, one general-purpose agent, a script, or the current manual process)._ | _[baseline result]_ | _Established the starting point._ |
| Iteration 1 | _TBD_ | _[new result]_ | _[kept / revised / removed]_ |
| Iteration 2 | _TBD_ | _[new result]_ | _[kept / revised / removed]_ |
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
