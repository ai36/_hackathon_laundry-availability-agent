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
- **Cases:** target ≥10 P0 single-frame cases across states × conditions (`out_of_order`,
  low-light, occlusion, a synthetic "person in frame" hard case — full list in
  `docs/EVALUATION.md`) + 3 P1/P2 sequence cases. **Actual so far:** 9 labelled still frames
  (`data/splits/evaluation.txt`) = 61 machine-observations, 45 determinate; the dryer-wall
  video frames are being added to reach ≥10.
- **Baseline:** single Claude vision prompt on the whole frame (same metric, same frames);
  contextual baseline = the manual "walk over and check" process.
- **Harness:** `npm run eval -- --mode=baseline|agent --split=evaluation --live|--replay`.
  `--replay` re-scores from `data/cache/<mode>/` with no API key — verified to reproduce the
  baseline numbers exactly.

## Progression

| Stage | What we tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Setup | Bootstrapped project infra: Next.js 16 + TS + Tailwind v4 + MobX, skills `find-skills` + `grillme`, docs/logging scaffold. Not an iteration on the solution — the starting line. | `npm run typecheck` / `lint` / `build` results below | Infra in place; next step is to define the problem and build the baseline. |
| Scoping | Ran the `grillme` Socratic-interview skill to turn "laundry3" into a defined problem, user, MVP, metric, baseline, dataset plan, and phased scope. | `docs/PROBLEM.md`, `docs/EVALUATION.md`, D-0005 | Problem pinned: per-machine free/occupied status from laundry-room frames; core = agent → verified status list. |
| Baseline | Single `claude-sonnet-5` vision call per frame on the whole (downscaled + redacted) image; given the frame's machine-id list + numbering convention, no ROI / calibration / memory / verification. `npm run eval -- --mode=baseline --split=evaluation --live`. | **accuracy 31.1%**, harmful-error 11.1%, coverage 60.0%, acc-on-covered 51.9% (45 determinate obs, 9 frames). Report: `docs/artifacts/eval-baseline-2026-08-28.json`; replay cache: `data/cache/baseline/` (9 files, reproduces frames-absent). Cost $0.081, 25.5k in / 3.0k out tokens. Single sample — the model is stochastic (see `docs/EVALUATION.md` limitations). | Weak starting point, as expected: model abstains on 11/27 free machines, **never** identifies `out_of_order` (0/8), and makes 5 harmful errors (3 of them `out_of_order`→`free`). Redaction bands sit over some displays — same handicap for the agent, so the comparison stays fair. Lots of headroom. |
| Iteration 1 (P0) | _TBD — per-machine ROI crop (agent gets a tight image per machine instead of the whole frame)._ | _[new result]_ | _[kept / revised / removed]_ |
| Iteration 2 (P0) | _TBD — explicit verification pass for low-confidence machines._ | _[new result]_ | _[kept / revised / removed]_ |
| Iteration 3 (P1) | _TBD — temporal memory / change-detection._ | _[new result]_ | _[kept / revised / removed]_ |
| Final | _TBD — combine what worked._ | _[final result]_ | _Main contribution: …_ |

## Baseline vs. final comparison

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Per-machine accuracy (determinate GT) | 31.1% | _[value]_ | _[change]_ |
| Harmful-error rate | 11.1% | _[value]_ | _[change]_ |
| Coverage | 60.0% | _[value]_ | _[change]_ |
| Cost per frame | ~$0.009 | _[value]_ | _[change]_ |
| Human time per task | _[value]_ | _[value]_ | _[change]_ |

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

### 2026-08-28 — initial ground-truth labels

- `npm run typecheck` / `npm run lint` — **pass**; `npm test` — **23/23**.
- `npm run label:check -- --split=evaluation` — **OK** (9 frames, 61 observations:
  27 free / 10 occupied / 8 out_of_order / 16 unknown).
- Author spot-check of the 9 label files: **approved as correct** (2026-08-28).

### 2026-08-28 — first baseline run

- `npm run eval -- --mode=baseline --split=evaluation --live` — 9 `claude-sonnet-5` calls,
  $0.081. **accuracy 31.1% · harmful-error 11.1% · coverage 60.0% · acc-on-covered 51.9%**
  (45 determinate obs). Confusion: `out_of_order` 0/8 correct; 11/27 free → `unknown`.
- **`requestHash` no longer folds the image bytes into the cache key** (they did, which made
  `--replay` need the git-ignored frames). Verified: `data/public/frames/` removed +
  `ANTHROPIC_API_KEY` unset → `--replay` reproduces the identical numbers from
  `data/cache/baseline/` (9 files, ~34 KB, committed). Report artifact drops its timestamp
  so it regenerates byte-identically.
- `typecheck` / `lint` pass; `npm test` **23/23**.

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
