# Worklog

Chronological record of every meaningful change to this project. Newest entries first.
Update this file with `/worklog` (see `.claude/commands/worklog.md`) or by hand.

Entry format:

```
### YYYY-MM-DD HH:MM — short title
- concrete change (file / command / decision)
```

## Log

### 2026-08-28 — First baseline number

- Author confirmed the 9 label files correct (spot-check) and set `ANTHROPIC_API_KEY`.
- **Bug 1:** the model returned its own positional ids ("center-washer") → 0%. Fixed:
  `baselinePrompt(machineIds)` / `classifyPrompt(…, machineIds)` pass the frame's
  machine-id list + the global numbering convention (fair — *which* machines, not their
  states); `run-eval.ts` reads the ids from each frame's label. Methodology → D-0012.
- **Bug 2 (G10 blocker, from the compliance review):** `requestHash` folded the frame image
  bytes into the cache key → `--replay` failed on a clean checkout (frames are git-ignored).
  Fixed: hash the semantic key only (`cacheKey` + prompt + crop). Report artifact dropped
  its timestamp → regenerates byte-identically.
- **Baseline:** `npm run eval -- --mode=baseline --split=evaluation --live` — 9
  `claude-sonnet-5` calls, $0.081. **accuracy 31.1% · harmful-error 11.1% · coverage 60.0% ·
  acc-on-covered 51.9%** (45 determinate obs). `out_of_order` never recognised (0/8);
  11/27 free → `unknown`; 5 harmful errors. Single stochastic sample.
- **`--replay` verified frames-absent:** `data/public/frames/` moved away + key unset →
  reproduces 31.1% exactly from `data/cache/baseline/` (9 files, force-added past the
  `data/cache/*` gitignore). Report: `docs/artifacts/eval-baseline-2026-08-28.json`.
- `docs/EVALUATION.md`: added limitations (GT-derived frame membership = unrealistic but
  symmetric assist; "off" = author-confirmed not-usable; single stochastic sample).
  `docs/REPRODUCTION.md` baseline section filled with real numbers.
- Verification: `typecheck` / `lint` pass; `npm test` **23/23**.

### 2026-08-28 — Initial ground-truth labels

- Author annotated 9 reference frames (`data/raw/_reference/`) with global ids and supplied
  a per-machine state list; roster confirmed as **W-01…W-16 + D-01…D-16** (only D-01…D-10
  and most washers appear in current photos — more angles are an integrator task).
- `scripts/gen-initial-labels.ts` (run once, kept as provenance) converts the state list to
  `data/labels/*.json`. Vocabulary map: `busy`→`occupied`, `error`→`out_of_order`,
  `off`→`out_of_order` (author's usage), `unknown`→`unknown` + `gtDeterminate:false`.
- **9 frames labelled, 61 machine-observations:** 27 free / 10 occupied / 8 out_of_order /
  16 unknown (45 determinate). `data/splits/evaluation.txt` = all 9; `smoke.txt` = img_1819.
- `MachineLabel` gains an optional free-text `note` (labeller comments / judgement calls;
  not scored) — distinct from the controlled `observationNotes` tag list.
- `docs/LABELING.md`: added the overlapping-angles rule (same id across frames) and the
  "camera coverage is a deployment setting" note (per-angle readable-machine list).
- **`bbox` is omitted** in these labels — it is only used for per-ROI calibration (P1), not
  the whole-frame baseline. `label:new` no longer scaffolds a `[0,0,0,0]` placeholder;
  `docs/LABELING.md` / `data/labels/README.md` mark it optional.
- Video-derived frames (dryer wall) not yet labelled — to be added to the eval split.
- Pending: author spot-check of the labels (ground rule 5); first `--live` baseline run
  (needs `ANTHROPIC_API_KEY`).
- Compliance review: **PASS WITH RISKS — no blockers.** Applied: `smoke` split redefined as
  an explicit **subset of `evaluation`** (D-0009) so it no longer "overlaps"; added a
  "Ground truth & labeller" section to `docs/EVALUATION.md` (single author-labeller, spot-check
  required before any number, second labeller out of scope); D-0006 amendment records the
  `note` field + the author-vocabulary map; `docs/CHANGELOG.md` "Cases" reconciled to the
  actual 9 frames / 61 obs with the ≥10 target still open; fixed "8"→"9" reference count.
- Verification: `typecheck` / `lint` pass; `npm test` **23/23**; `label:check --split=evaluation` OK.

### 2026-08-28 — Real Claude vision client

- Added `@anthropic-ai/sdk` (`^0.122`) and `AnthropicVisionClient` in `src/agent/vision.ts`
  (guided by the `claude-api` skill): sends the frame as base64 JPEG + the prompt via
  `client.messages.create`, `output_config: { effort: "low" }`, `max_tokens: 4000`. Model
  from `laundry3.config.ts` (`claude-sonnet-5`), overridable per-run with
  `LAUNDRY3_VISION_MODEL`. Credentials from the environment (`.env` / `ant auth`). Returns
  input/output token counts and a `costUsd` from a per-model price table (sonnet-5 $2/$10
  per MTok).
- `scripts/run-eval.ts`: **exactly one** backend flag is required so a bare run can't bill —
  `--live` (paid API call + cache write), `--replay` (cache only, no key), `--fake` (offline
  stub, no cache). Report now carries a `totals` block (vision calls, tokens, `costUsd`) and
  prints the aggregate.
- Compliance review: **PASS WITH RISKS — no blockers.** Applied: `--live` gate (was:
  live-by-default, accidental-spend risk); `--fake` bypasses the cache entirely (was:
  wrote empty responses into the replay cache); `totals` block added; price table dated
  with source.
- `pipeline.ts` classify/verify remain stubs — the real per-ROI loop comes after the first
  baseline number and the labelled dataset.
- Verification: `typecheck` / `lint` / `build` pass; `npm test` **23/23**;
  `npm run eval -- --fake` runs end-to-end. No live API call yet (needs `.env` + labelled
  frames).

### 2026-08-28 — Frame redaction pipeline

- User: the frames are of a laundry room that is **not theirs** → redact everything that
  could identify the location, without hurting machine-status legibility.
- `scripts/prepare-dataset.ts` extended: reads `data/raw/redactions.json` (git-ignored;
  schema committed as `data/redactions.example.json`) and applies per-source rectangles via
  ffmpeg — `boxblur` (default, strength 30) or solid `drawbox` fill (`mode: "fill"`, for
  windows). Also `--blur-all=N` coarse fallback. Runs after downscale, before the metadata
  strip. Coords are in produced-frame pixel space, keyed by source basename.
- Wrote a best-effort `data/raw/redactions.json` for all 16 sources from a spot review of
  ~7 frames. Verified: `img_1825` (close-up) — Coin Meter phone/email sticker fully blurred,
  Speed Queen display + card readers still sharp. `img_8629` (angled side view) — phone
  sticker + windows + wall art blurred, but the spec is heavy-handed there; the
  `IMG_8629-8633` group is marked `TUNE` and still needs a careful per-frame pass.
- Frames remain **git-ignored** — held until the redaction pass is verified frame-by-frame
  and authorization is confirmed (`data/README.md` "Redaction" + "Held-out frames").
- `docs/DECISIONS.md` D-0009 updated; `data/README.md` gains a "Redaction" tuning loop.
- Verification: `npm run typecheck` pass; `npm run dataset:prepare` produces 45 redacted
  frames (3.9 MB); `npm run check:data` passes.

### 2026-08-28 — 4th machine state, labelling workflow, .env

- **`out_of_order` state added** (`неисправна/отключена`) — state space is now
  `free` / `occupied` / `out_of_order` / `unknown` (`docs/DECISIONS.md` D-0006 amendment).
  `out_of_order` is determinate, not an abstention. Harmful error redefined: predicted
  `free` while truth is `occupied` **or** `out_of_order`. Updated `src/eval/{types,score}.ts`
  (+3 tests, now 23/23), `src/agent/parse.ts`, `src/agent/{baseline,pipeline}.ts` prompts,
  `src/eval/dataset.ts` validator, `docs/PROBLEM.md`, `docs/EVALUATION.md` (metric, rubric,
  new case 14; P0 count 14→15).
- Fixed a schema-key inconsistency: `docs/PROBLEM.md` label format now uses `camelCase`
  (`frameId`, `frameConditions`, `machineId`, `gtDeterminate`, `observationNotes`) to match
  `src/eval/types.ts` / `data/labels/README.md`.
- **Labelling workflow** (`docs/DECISIONS.md` D-0010, full guide `docs/LABELING.md`):
  - `data/machines.json` — canonical roster (placeholder 16 W + 16 D).
  - `scripts/label.ts` + `npm run label:new|label:check|label:stats` — scaffold a label
    file from the roster, validate (ids in roster, no dups, splits disjoint, images exist),
    show coverage/state distribution.
- **Secrets:** `.env.example` committed (`ANTHROPIC_API_KEY=` blank, optional
  `LAUNDRY3_VISION_MODEL`); `.gitignore` `!.env.example`; `scripts/load-env.ts` calls
  `process.loadEnvFile(".env")` before `run-eval` reads env. Keys never enter chat/commits.
- Verification: `typecheck` / `lint` / `build` pass; `npm test` **23/23**; `label:*` and
  `eval` run.

### 2026-08-28 — Dataset pipeline + eval/agent skeleton

- User supplied real mock data (7 JPG + 4 jpeg stills, 5 MOV clips ~7 s each; **16 washers +
  16 dryers**). All carried EXIF/XMP + GPS + Apple device info; the privacy gate blocked them
  (as designed).
- Moved originals to git-ignored `data/raw/`. Added `scripts/prepare-dataset.ts`
  (`npm run dataset:prepare`, ffmpeg 8.1.2): stills → downscaled ≤1600px, videos → frames at
  `--fps` (default 1) ≤1280px, **all with `-map_metadata -1` + a JPEG marker stripper**
  (drops every APPn segment — EXIF/XMP/IPTC/ICC/Adobe — and the COM comment ffmpeg writes;
  keeps a plain JFIF APP0 if present). Output: `data/public/frames/` — 45 frames, 5.2 MB,
  `manifest.json` with source + approx timestamp. Metadata gate passes; byte check confirms
  no EXIF/XMP/ICC/Lavc-COM remain.
- **Frames are HELD OUT of git for now.** Spot review of the produced frames found a vendor
  service sticker with a phone number and window views to the outdoors — identifying details
  under the `docs/PROBLEM.md` data plan. `/data/public/frames/` is git-ignored until (a) the
  laundry-room manager's authorization to publish is confirmed and (b) the stickers /
  windows / any apartment numbers are redacted. The pipeline that produces them is
  committed; the images are not.
- Privacy gate extended: rejects any video staged under `data/`. `.gitignore`: `data/public/`
  is ignored except its `README.md` (and `frames/` too, once cleared for publication);
  `*.mov/*.mp4` never committed; `data/cache/*` ignored except its README.
- `laundry3.config.ts` → `site.machines: { washers: 16, dryers: 16 }`.
- Skeleton (`tsx`-run, `@/*` alias):
  - `src/eval/types.ts` — label schema types (3-way state, frame/observation conditions,
    bbox, predictions).
  - `src/eval/score.ts` (+ 5 tests) — accuracy over determinate GT, harmful-error rate,
    coverage, accuracy-on-covered, confusion matrix. Abstaining ≠ harmful; missing
    prediction = `unknown`.
  - `src/eval/dataset.ts` — load `data/labels/*.json` (shape-checked), `data/splits/*.txt`.
  - `src/agent/parse.ts` (+ 5 tests) — tolerant JSON extraction from a vision reply.
  - `src/agent/vision.ts` — `VisionClient` interface, `CachedVisionClient` (JSON cache +
    `--replay` = cache-only), `FakeVisionClient` (deterministic offline). Real Anthropic
    client is a marked TODO.
  - `src/agent/baseline.ts` — one whole-frame vision call → predictions (the fair baseline).
  - `src/agent/pipeline.ts` — calibrate → classify → verify → abstain; classify/verify are
    stubs with the real shape sketched.
  - `scripts/run-eval.ts` (`npm run eval -- --mode=baseline|agent --split=… [--replay]`) —
    runs, scores, writes `docs/artifacts/eval-<mode>-<date>.json`.
- `data/{labels,splits,public,cache}/README.md` + empty `calibration.txt` / `evaluation.txt`
  / `smoke.txt`.
- Verification: `typecheck` / `lint` / `build` pass; `npm test` **20/20**; `npm run eval`
  runs end-to-end (Fake client → empty predictions until labels + real client land).
- Next: confirm authorization + redact frames so they can be committed → label frames (with
  the user) → fill splits → wire the real Anthropic vision client → first real baseline
  number.

### 2026-08-28 — Deployment config module

- Added a typed, validated deployment config for site integration (`docs/DECISIONS.md`
  D-0008), separate from the machine-generated calibration site-config.
- `laundry3.config.ts` (root) — overrides only; `src/config/defaults.ts` — all defaults;
  `src/config/load.ts` — deep-merge + `validateConfig()` (ranges, types, IANA zone,
  `staleAfterSeconds ≥ stateRefreshSeconds`); `src/config/{types,define,resolved,index}.ts`.
- Consumers: `import { config } from "@/config"`. Private overrides:
  git-ignored `laundry3.config.local.ts`.
- Settings groups: `site` (name, timezone, machineCount), `reservation` (enabled,
  holdMinutes, maxActivePerUser, maxReservedFractionOfFree, reconcileOnExpiry), `agent`
  (visionModel, maxVisionCallsPerFrame, abstainWhenUncertain, verification.*,
  changeDetection.*), `runtime` (stateRefreshSeconds, staleAfterSeconds), `cycles`
  (defaultWash/DryMinutes), `portal` (showConfidence, confirmOnArrivalNotice), `paths`
  (siteConfig, dataset, cache). Full table in `docs/CONFIGURATION.md`.
- Added `tsx` (devDep) to run `.ts` tests and, later, `.ts` eval scripts with the `@/*`
  alias. New scripts: `npm test` (`tsx --test`), and `src/config/load.test.ts`.
- Feedback: machines come in two types → `site.machineCount` replaced with
  `site.machines: { washers, dryers }` (non-negative ints, total ≥ 1; supports a
  washers-only or dryers-only site). Tests updated → **10/10 pass**.
- Compliance review of the config module: **PASS WITH RISKS — no blockers.** Applied:
  - `docs/REPRODUCTION.md` "Checks" now lists `npm test` (expect 10/10) and
    `npm run check:data`; runtime table notes `tsx` and the count.
  - `reservation.enabled` now defaults **`false`** (was `true`) — reservations are P2 and
    unbuilt; note added in `docs/CONFIGURATION.md` and D-0008 that the other `reservation.*`
    values are the intended production settings, and P2 features default off.
- No separate subagent review for the `machines`-by-type tweak + these fixes — small schema
  change covered by passing tests + typecheck, and the config feature was just reviewed.
  Self-check vs `docs/HACKATHON-RULES.md`: no new deps, no data, no results claims, G8
  clean. Next substantive change (project skeleton / baseline) gets a full review.
- Verification: `npm run typecheck` / `lint` / `build` pass; `npm test` 10/10;
  `npm run check:data` pass.

### 2026-08-28 — Reservations are advisory (walk-in preemption)

- Edge case raised: not every tenant uses the app; a reserved machine can be physically
  taken by someone already in the room (esp. if they need a second machine).
- `docs/DECISIONS.md` D-0007: the reservation record is a hint, the **camera-derived state
  is authoritative**. Runtime agent reconciles reservation vs. observation on each refresh;
  a pre-empted machine flips to `occupied` and the reserving user is re-routed before the
  trip is wasted. Guard rails: one reservation/user, can't reserve all, 5-min expiry.
- Stated as a known limitation: a specific reservation can be lost; value is a lower
  *average* wasted-trip rate, not a per-trip guarantee. Reservation stays P2; its metric
  (reservation-honoured rate) lives in a simulation, separate from the P0 accuracy metric.
- `docs/PROBLEM.md` reservation section rewritten; `docs/EVALUATION.md` adds P2 sequence
  case S3.
- Compliance review: **PASS WITH RISKS — no blockers.** Applied: pre-emption notice is
  explicitly **portal state on the existing read page**, not a new outbound channel (G4
  scope kept tight; PROBLEM.md consequential-actions section updated to match, D-0007 too);
  EVALUATION sequence-case heading renamed "P1 / P2" with a per-case Tier column and
  independent drop rules (P1 and reservation sim are separate); made explicit that the
  pre-emption notice only helps a user who re-checks the portal before leaving. Review saved
  to `docs/trajectories/compliance/2026-08-28-reservations.md`.

### 2026-08-28 — 3-way machine state + per-observation conditions + label schema

- Feedback: `condition` is a property of the observation (person blocks an indicator,
  evening light, motion-lamp turns the room dark), not of a machine; and `state` needs an
  "unrecognised" value.
- **State space** is now `free` / `occupied` / **`unknown`** per machine per frame
  (`docs/DECISIONS.md` D-0006, supersedes the binary in D-0005). Portal shows `unknown` as
  "unknown — check on arrival".
- **Label schema** defined in `docs/PROBLEM.md`: frame object with `frame_conditions`
  (frame-wide list) + `machines[]` each with `state`, `gt_determinate`, optional
  `observation_notes` (per-machine list). Extensible vocabularies.
- **Metric** updated (`docs/PROBLEM.md`, `docs/EVALUATION.md`): primary = accuracy over
  determinate ground truth (agent `unknown` there = incorrect); secondary = **harmful-error
  rate** (false free/occupied; abstaining is not harmful), **coverage**, accuracy-on-covered.
  Report the three together.
- **Cases** reworked to 14 P0 single-frame cases with a `condition | scope` column mapping
  to the schema; added a `lights_off_no_motion` case where abstaining is the expected
  behaviour. Rubric section updated for 3-way scoring.
- Added `data/` scaffold (`data/README.md`, layout, privacy rules) and `.gitignore` rules:
  `data/raw/` + `data/frames/` never ship, only `data/public/` + `data/labels/` +
  `data/splits/` + curated `data/cache/`.
- `docs/CHANGELOG.md` evaluation-method section updated.
- Independent compliance review of this change: **PASS WITH RISKS — no blockers.** Applied:
  - **EXIF/metadata**: added a "strip all embedded metadata from every committed frame" rule
    to `data/README.md` (GPS / device serial / timestamps identify the building + author).
  - **Enforcement is now more than prose**: `scripts/check-data-privacy.mjs` +
    `npm run check:data` + committed `.githooks/pre-commit` (enable with
    `git config core.hooksPath .githooks`). Dependency-free; refuses a commit that stages
    anything under `data/raw//data/frames/`, an image outside `data/public/`, or an image
    carrying EXIF / XMP / IPTC / PNG-text metadata. Tested: EXIF JPEG rejected, `data/raw/`
    path rejected, clean JPEG in `data/public/` passes.
  - D-0005 now carries a "primary-metric portion superseded by D-0006" note.
  - Aligned `lights_off` → `lights_off_no_motion` in `docs/CHANGELOG.md`.
  - Updated the four-questions summary in `docs/PROBLEM.md` for the 3-way state / harmful-error
    framing.
- `docs/REPRODUCTION.md` setup now includes `git config core.hooksPath .githooks`.

### 2026-08-28 — Trajectory logging convention

- Added `docs/trajectories/` (README + `compliance/`, `calibration/`, `runtime/`,
  `baseline/` sub-folders) for hackathon deliverable #4 (agent trajectories) and ground
  rule 9. A full build-chat transcript is explicitly **not** required — the process record
  stays in `docs/WORKLOG.md` + `docs/DECISIONS.md`.
- Saved the two compliance reviews run so far: `docs/trajectories/compliance/2026-08-28-infra-bootstrap.md`
  and `2026-08-28-problem-scoping.md` (verdict + risks + follow-up actions; not the raw JSONL).
- `CLAUDE.md` compliance-review rule now says to save each review under
  `docs/trajectories/compliance/`; `/worklog` command updated to match.
- No separate compliance-agent run for this change — it only adds a docs convention and
  transcribes already-reviewed outputs. Manual check against `docs/HACKATHON-RULES.md`:
  no code, no data, no claims, no new tools; G2/G8 unaffected; consistent with deliverable
  #4. Next substantive change gets a full review.

### 2026-08-28 — Problem scoping via the grillme skill

- Ran the `grillme` Socratic-interview skill against the project to define the task.
- Outcome (full detail in `docs/PROBLEM.md`, `docs/EVALUATION.md`, `docs/DECISIONS.md` D-0005):
  - **User:** apartment-complex tenant using a shared laundry room (~20–30 machines, half
    washers / half dryers).
  - **Bottleneck:** no advance visibility of machine availability → wasted trips carrying
    laundry back and forth.
  - **MVP core (P0):** agent → verified per-machine status list (state + confidence +
    rationale) via a multi-step graph with a verification pass; plus a calibration step that
    builds a per-site config (ROIs, reference crops, few-shot, thresholds) — no fine-tuning.
  - **Primary metric:** overall per-machine free/occupied accuracy on a labelled frame set.
    Secondary: tokens/cost per frame.
  - **Baseline:** single Claude vision prompt on the whole frame (same metric, same frames);
    contextual baseline = the manual "walk over and check" process.
  - **Vision engine:** Claude vision API + `--replay` from cached responses (reproducible
    with no key) + a small live `smoke` subset.
  - **Data:** author's own real laundry room — multi-angle stills + a short time-ordered
    series; shot with no people, tightly framed, identifying details removed; "person in
    frame" hard case is synthetic.
  - **Deadline:** working by 2026-08-30 12:00 UTC-7; solo. P1 = change-detection + timers +
    abandoned laundry; P2 = reservation flow + notifications.
- Rewrote `docs/PROBLEM.md` and `docs/EVALUATION.md` with real content; added D-0005;
  updated `docs/CHANGELOG.md` (evaluation method + progression rows); added `hackaton` to
  `cspell.json` (the remote repo name is spelled that way).
- Independent compliance review of the scoping diff: **PASS WITH RISKS — no blockers.**
  Applied:
  - Data plan (G6/G7): added an explicit rule to exclude/blur **other tenants' belongings**
    (baskets, carts, clothing), prefer a clear room or crop to machine faces, and require
    that the manager's authorization covers filming the common area for this purpose.
  - Case 13 (person in frame): record the augmentation source (synthetic or licensed/own)
    next to the frame.
  - Closed the G5 open question: **calibration-reviewed only, no runtime human checkpoint**
    for the hackathon (wrong "free" = today's wasted trip, low harm); portal shows
    confidence + "confirm on arrival"; runtime review is a documented production path.
  - `docs/EVALUATION.md`: tightened the "case" definition (one frame); split P1 sequence
    cases (S1/S2) out of the P0 count; expanded P0 to 13 single-frame cases so "10+" holds
    without P1.
  - D-0005 / CHANGELOG: pinned **Iteration 1 (ROI calibration)** and **Iteration 2
    (verification pass)** inside P0 so the changelog has ≥2 measured iterations.
  - `docs/REPRODUCTION.md`: marked the baseline/eval/expected-output sections as a
    pre-submission blocker (G10).
- Next: build the labelled dataset + the single-prompt baseline + scoring harness.

### 2026-08-28 — Git workflow + compliance review as system rules

- Added GitHub remote `origin` = `git@github.com:ai36/_hackaton_laundry3.git` (SSH auth verified).
- Renamed the initial branch to `dev`; `main` is integrated manually by the user.
- `.claude/hooks/git-guard.mjs` — PreToolUse(Bash) hook that blocks any commit / merge /
  rebase / push that would write to `main` / `master`. Registered in `.claude/settings.json`
  under `hooks.PreToolUse`.
- `.claude/hooks/git-guard.test.mjs` — smoke test for the hook; `node .claude/hooks/git-guard.test.mjs`
  → 8/8 pass (blocks `push origin main`, `HEAD:main`, `dev:main`; allows `push -u origin dev`,
  `git diff`, `git status`, non-git commands).
- `.claude/settings.json` — extended the permission allowlist with git write commands
  (commit, push, branch, checkout, switch, remote, ...); the hook is the real guard.
- `.claude/agents/hackathon-compliance.md` — subagent that reviews each diff against
  `docs/HACKATHON-RULES.md` (ground rules + scoring + process hygiene) and returns
  PASS / PASS WITH RISKS / CHANGES REQUIRED.
- `docs/HACKATHON-RULES.md` — full transcription of the hackathon PDF into the repo so the
  reviewer and judges have it version-controlled.
- `CLAUDE.md` — added a "System rules (non-negotiable)" section: git workflow + mandatory
  `hackathon-compliance` review before every push.
- Memory: `git-workflow`, `compliance-review` feedback entries; `docs/DECISIONS.md` D-0004.
- Ran an independent compliance review (general-purpose agent following
  `.claude/agents/hackathon-compliance.md`) on the full staged initial commit.
  **Verdict: PASS WITH RISKS — no blockers.** Risks raised and how they were handled:
  - WORKLOG referenced a compliance verdict that wasn't written → this entry now records it.
  - "Tested with 5 payloads" claim had no committed evidence → added
    `.claude/hooks/git-guard.test.mjs` (8/8 pass) and reworded the note.
  - Node pinned only in prose → added `package.json` `engines` (`>=24 <25`) and `.nvmrc` (`24`).
  - No runtime/cost figures → added an approximate table to `docs/REPRODUCTION.md`.
  - Verification stored no raw logs → added `docs/artifacts/verification-2026-08-28.txt` and
    `docs/artifacts/build-2026-08-28.txt`; `docs/CHANGELOG.md` points at them.
  - `grillme` license not recorded → noted MIT in `docs/SKILLS.md` and D-0003.
  - Remaining as accepted low-priority: keep capturing raw command output for future
    measured results.
- Added `.prettierignore` entries for `.nvmrc` and `docs/artifacts/`.

### 2026-08-28 — Project infrastructure bootstrap

- Scaffolded a Next.js 16 app in place with `create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes`.
- Locked stack versions (see `docs/DECISIONS.md` D-0001): next 16.3.3, react/react-dom 19.2.8, typescript ^5, tailwindcss ^4 (`@tailwindcss/postcss`), eslint ^9 + `eslint-config-next` 16.3.3.
- Added MobX: `mobx@^7`, `mobx-react-lite@^5` (peer-compatible with React 19).
- Added dev tooling: `prettier@^3`, `prettier-plugin-tailwindcss`; config in `.prettierrc.json` / `.prettierignore`.
- Added npm scripts: `typecheck` (`tsc --noEmit`), `format`, `format:check`.
- Created MobX infrastructure under `src/stores/`:
  - `root-store.ts` — `RootStore` composition root, `configure({ enforceActions: "always" })`, per-request store on the server + memoized browser store, `RootStoreHydration` type.
  - `store-provider.tsx` — `"use client"` `StoreProvider` + `useStore()` hook, `enableStaticRendering` on the server.
  - `example-store.ts` — placeholder domain store (`ExampleStore`) demonstrating `makeAutoObservable`.
  - `index.ts` — barrel exports.
- Wired `<StoreProvider>` into `src/app/layout.tsx`; set metadata title/description to `laundry3`.
- Added `src/components/example-counter.tsx` (`observer` component) and simplified `src/app/page.tsx` to a minimal landing that exercises the store.
- Connected agent skills (see `docs/SKILLS.md`):
  - `find-skills` (skills.sh / `npx skills` CLI) — already installed globally.
  - `grillme` (`jekudy/grillme-skill@grillme`) — installed to `~/.agents/skills/grillme`, symlinked into `~/.claude/skills/`. Security assessments: Gen "Safe", Socket "0 alerts", Snyk "Low Risk".
- Added Claude Code project config: `.claude/settings.json` (permission allowlist for safe dev commands), `.claude/commands/worklog.md` (logging command).
- Rewrote `CLAUDE.md` with project overview, stack, commands, conventions, and the logging rule. Kept the `@AGENTS.md` include (Next.js writes agent rules there).
- Added hackathon deliverable docs: `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/PROBLEM.md`, `docs/REPRODUCTION.md`, `docs/EVALUATION.md`, `docs/SKILLS.md`.
- Added `cspell.json` with project vocabulary (laundry3, hackathon, grillme, mobx, ...).
- Fix during verification: `react-hooks/refs` lint error in `store-provider.tsx` — replaced the `useRef` lazy-init pattern with `useState(() => initRootStore(initialData))`.
- Ran `npm run format` to normalize `.claude/settings.json` and `next.config.ts`.
- Verification (all pass): `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — details in `docs/CHANGELOG.md`.
- `git init` (no commit) so changes are tracked; nothing committed yet.
