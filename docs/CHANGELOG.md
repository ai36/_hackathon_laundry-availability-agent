# Improvement Changelog

The story of how this solution evolved, per the hackathon brief. Start from the simple
baseline, add one entry per meaningful experiment, tie each to evidence, and record the
decision it led to. Include experiments that were later removed and what they taught us.

## Evaluation method

- **State space:** `free` / `occupied` / `out_of_order` / `unknown` per machine per frame
  (`out_of_order` = broken/taped off; `unknown` = not determinable). Conditions (person
  blocking indicator, low light, lamp off) are per-observation, not per-machine — see
  `docs/DECISIONS.md` D-0006 (+ amendment).
- **Primary metric:** overall per-machine state accuracy over determinate ground truth on a
  labelled laundry-room frame set. Secondary: **harmful-error rate** (false free/occupied),
  **coverage**, tokens / cost per frame. Full plan in `docs/EVALUATION.md`.
- **Cases:** 15 P0 single-frame cases spanning states × conditions (incl.
  `lights_off_no_motion`, occlusion, an `out_of_order` machine, and a synthetic "person in
  frame" hard case) + 3 P1/P2 sequence cases.
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

### 2026-08-28 — deployment config module

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` (`tsx --test`) — **10/10 pass** (`src/config/load.test.ts`: defaults valid,
  deep-merge, washers-only site, and rejection of bad fraction / hold time / IANA zone /
  stale window / non-integer count / empty roster).
- `npm run check:data` — **pass** (no data staged).

### 2026-08-28 — dataset pipeline + eval/agent skeleton

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` — **20/20 pass** (config 10, `src/eval/score.test.ts` 5, `src/agent/parse.test.ts` 5).
- `npm run dataset:prepare` — 16 originals → **45 frames**, 5.2 MB, metadata-stripped
  (produced locally; held out of git pending authorization + redaction — see WORKLOG).
- `npm run eval -- --mode=baseline --split=evaluation` — runs end-to-end (empty split /
  Fake vision client; real client + labels pending).

### 2026-08-28 — out_of_order state + labelling workflow

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` — **23/23** (config 10, `score.test.ts` 8 incl. 3 `out_of_order`, `parse.test.ts` 5).
- `npm run label:new` / `label:check` / `label:stats` — run (0 labels yet).

### 2026-08-28 — real Claude vision client

- `npm run typecheck` / `npm run lint` — **pass**; `npm test` — **23/23**.
- `npm run eval -- --mode=baseline --split=<one frame> --fake` — runs end-to-end with the
  Anthropic SDK wired (no live call). Backend flag now mandatory (`--live`/`--replay`/`--fake`).
  First `--live` run pending `.env` + labelled split.

### 2026-08-28 — frame redaction pipeline

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**; `npm test` — **23/23**.
- `npm run dataset:prepare -- --force` — 45 frames, redaction applied from
  `data/raw/redactions.json` (16 source specs); `npm run check:data` passes.
- Manual spot check: frontal frames clean (phone/email/QR blurred, displays sharp);
  `IMG_8629-8633` group needs rectangle tuning — frames stay held out of git.
