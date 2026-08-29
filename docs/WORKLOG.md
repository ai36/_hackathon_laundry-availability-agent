# Worklog

Chronological record of every meaningful change to this project. Newest entries first.
Update this file with `/worklog` (see `.claude/commands/worklog.md`) or by hand.

Entry format:

```
### YYYY-MM-DD HH:MM — short title
- concrete change (file / command / decision)
```

## Log

### 2026-08-28 — Integrator console: Cameras CRUD + image upload; layout fixes (D-0015)

- `src/eval/site-config.ts` — `data/site-config.json` (cameras), typed load/write
  (validate camera + machine ids `[A-Za-z0-9_-]+`, no dups; sort), `parseMachineIds`
  (free-text → clean list), `upsertCamera` / `removeCamera`. +5 tests (51 total).
- `src/app/api/cameras/route.ts` — GET/POST/PATCH/DELETE → `data/site-config.json`.
- `src/app/api/upload/route.ts` — `POST` multipart: `kind` ∈ {camera-stub, camera-annotated,
  machine-reference}, `ownerId` (regex-restricted), `state` (for machine-reference) → saves
  jpeg/png/webp ≤ 4 MB to `data/site-config/<ownerId>/<name>.<ext>`, returns the repo path.
  `data/site-config/` git-ignored (arbitrary user images); `data/site-config.json` committed
  (starts `{"cameras": []}`). Curl-verified upload + `ownerId` traversal → 400.
- `src/components/cameras-editor.tsx` — CRUD on `/integrator`: per camera id + machine-id
  free-text + stub/annotated image upload + delete; add row.
- **Trust-boundary docstrings** in `/api/machines`, `/api/cameras`, `/api/upload` mirror the
  full `/api/corrections` warning (no auth → integrator-only local/on-prem; not for a shared
  or public host).
- **Layout:** container `max-w-6xl` → `max-w-[1100px]` (px, so it doesn't 2×-scale with the
  root font and cause page-wide horizontal scroll); card grid → `sm:grid-cols-2`; Machines /
  Cameras / Site-overview are `<details>` collapsed by default. Verified in Chrome — 2× font,
  no page overflow, editors expand cleanly.
- Screenshots regenerated (`portal-top.jpg` = tenant `/`, `portal-machines.jpg` = integrator
  `/integrator`); stale `portal-integrator-settings.jpg` removed.
- Compliance: 3 passes (font/split, Machines CRUD, Cameras CRUD) — all PASS / PASS WITH
  RISKS, no blockers. Consolidated record:
  `docs/trajectories/compliance/2026-08-28-integrator-console.md` (backfills the earlier
  passes too). Risk fixes applied: trust-boundary docstrings mirrored; `REPRODUCTION.md`
  reset note; screenshots regenerated; **`/api/upload` now magic-byte-sniffs** the content
  so the on-disk extension comes from the bytes, not the client mime.
- Verification: `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **51/51**. Routes: `○ /`, `ƒ /integrator`, `ƒ /api/{corrections,room,machines,cameras,upload}`.

### 2026-08-28 — Integrator console: Machines CRUD (D-0015)

- `src/eval/roster.ts` — typed roster (`RosterMachine` now carries optional `promptFragment`
  + `referenceShots`), `loadRoster` / `writeRoster` (validate id `[A-Za-z0-9_-]+`, type,
  no dups; sort washers-then-dryers, natural id order), `upsertMachine` / `removeMachine`.
  `buildRoomStatus` and `/api/room` now go through it. +6 tests (46 total).
- `src/app/api/machines/route.ts` — `GET` list, `POST` add (409 on dup), `PATCH` edit /
  rename (`targetId` = old id), `DELETE` remove. Node runtime, `force-dynamic`, no auth
  (same integrator-only local/on-prem boundary as `/api/corrections`, D-0016). Writes
  `data/machines.json`.
- `src/components/machines-editor.tsx` — table on `/integrator`: per-row id / type /
  `promptFragment` inline edit + delete, an add row. After any change it re-fetches
  `/api/room` so the grid reflects the new roster.
- Curl-tested add → patch(promptFragment) → path-traversal(400) → delete; `data/machines.json`
  byte-identical after the round-trip, restored from backup regardless.
- Build routes: `○ /`, `ƒ /integrator`, `ƒ /api/{corrections,room,machines}`.
- **Still to build:** cameras CRUD + stub/annotated image upload, per-machine reference-state
  screenshots, `site-config.json` (cameras). Screenshots refresh after that.
- Verification: `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **46/46**.

### 2026-08-28 — Portal: 2× font, split tenant / integrator pages

- **Owner feedback:** text too small; integrator settings should be their own page; the
  D-0015 CRUD (cameras, machines, prompts, reference screenshots) needs building.
- **Font ×2.** `html { font-size: 200% }` in `globals.css` (drives every rem-based Tailwind
  size). All px-literal `text-[10/11px]` converted to `text-xs`. Container `max-w-4xl` →
  `max-w-6xl`; card grid `grid-cols-1 sm:2 lg:3 xl:4`; `overflow-wrap: anywhere` on `main` +
  `break-words` on every id list / note so nothing widens the page.
- **Page split.** `/` = `RoomView` (tenant: state only, "integrator →" link).
  `/integrator` = `IntegratorView` (`force-dynamic`: per-card confidence + source +
  mark-wrong, "↻ refresh recognition", Site overview = roster + mock-frame→machine map).
  Shared `MachineCard` + `STATE_STYLE` extracted to `src/components/machine-card.tsx`.
  `src/components/room-status.tsx` deleted; `?role=` toggle gone (route is the role now).
- Routes: `○ /`, `ƒ /integrator`, `ƒ /api/corrections`, `ƒ /api/room`.
- **Still to build (this feedback):** machines CRUD (id / type / prompt fragment / reference
  screenshots), cameras CRUD (id / machine-id list / stub image / annotated screenshot),
  `data/site-config.json` schema. Screenshots to refresh after that.
- Verification: `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **41/41**; visually checked both pages in Chrome (font 2×, no overflow).

### 2026-08-28 — Portal: full roster, refresh button, integrator settings panel

- **Fix:** `buildRoomStatus` now iterates the whole `data/machines.json` roster (32) instead
  of only machines seen in the report. `D-11…D-16` (16 dryers exist; the mock photos cover
  10) now show as `unknown` / `seenIn: 0` / `source "—"`. A `machine`-scope correction still
  applies to an uncovered machine; the "mark wrong" POST files those under `_roster` and
  forces `scope: machine`. +1 test (41 total).
- **"↻ refresh recognition"** button in the integrator header → `GET /api/room`
  (`src/app/api/room/route.ts`, Node runtime) re-reads the report + re-fuses corrections and
  swaps the store's machine list. In the D-0016 container this route is the re-capture +
  re-classify hook; in P0 it's a cheap re-fusion.
- **"Integrator settings"** collapsible panel: roster stats (16 W / 16 D, N covered,
  not-covered list), the mock-camera → machine map (frame → machines whose state it sets),
  and an explicit "camera/mask/reference/prompt editing is D-0015, not in this build" note.
- Build: `○ /`, `ƒ /api/corrections`, `ƒ /api/room`. Screenshot added
  (`docs/assets/portal-integrator-settings.jpg`); README walkthrough updated.
- Verification: `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **41/41**; `check:data` — **pass**; `/api/room` returns 32 machines
  (16 dryers, D-11–D-16 uncovered), counts sum to 32.

### 2026-08-28 — Portal: integrator role + clickable correction loop (D-0015/D-0016 P0)

- **D-0016 P0 acceptance criterion met:** a judge with no API key and no hardware can walk
  the whole correction loop on the frozen 9-frame dataset.
- **`buildRoomStatus` now overlays corrections** (D-0014): default report switched to
  `eval-baseline-2026-08-28.json` (raw baseline, so the correction overlay is visible), a
  `machine`-scope correction wins outright, an `observation`-scope one wins for its source
  frame. `MachineView` gains `corrected` + `correction {scope, note}`; `RoomStatus.provenance`
  gains `corrections` count. +1 test (38 total).
- **`src/eval/corrections.ts`:** extracted `writeCorrection()` (read-modify-write, shared by
  the CLI and the API) and `correctionFor()` (frame-aware lookup). `scripts/correct.ts` now
  calls the shared writer.
- **`src/app/api/corrections/route.ts`** (Node runtime, `force-dynamic`): `POST` writes
  `data/corrections/<frame>.json` and returns the freshly re-fused `RoomStatus`; `GET`
  summarises the store. Works under `npm run dev` and any Node/Docker host; the static `/`
  route is unaffected (build still shows `○ /`, `ƒ /api/corrections`).
- **Portal roles** (`src/components/room-status.tsx`, `MachinesStore.role`):
  `?role=integrator` reveals per-card agent confidence + source frame + a **"✕ mark wrong"**
  control (state picker + note + a "durable" toggle → `scope: machine`). On submit the store
  swaps in the API's re-fused room; the card flips and gets an **integrator** badge. Tenant
  view (`/`) shows only the resulting state + "confirm on arrival" — no confidence, no
  controls.
- Verified end-to-end in Chrome: integrator view shows the 3 committed corrections (W-04,
  D-02, D-06 out-of-order, durable badge); marking W-09 `free` flipped the card and bumped
  the header counts live; the test correction was deleted afterwards. Screenshots refreshed
  (`docs/assets/portal-top.jpg` = tenant, `portal-machines.jpg` = integrator).
- Docs: README "Integrator walkthrough" section; D-0015 status → Partial (loop built, CRUD /
  masks / refs / prompt-synthesis still spec); D-0016 P0 marked done.
- **Not built** (deferred, still spec): camera/machine CRUD UI, mask upload, reference-state
  screenshots, per-machine prompt fragment editor, `site-config.json` schema, the
  correction→prompt feedback synthesis.
- Verification: `npm run typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **38/38**; `npm run check:data` — **pass**.

### 2026-08-28 — Cache refreshed on haiku + config knobs (capture interval, vision effort)

- **User decision:** keep `claude-haiku-4-5` (cost); refresh the cache so it matches the
  committed frames. Deleted the archived `claude-sonnet-5` cache (still in git at `e8de845`)
  and re-ran both modes `--live` on haiku against the committed author-redacted frames.
- **`agent.visionEffort` config knob** (`"none"` default). `AnthropicVisionClient` sent
  `output_config.effort: "low"` unconditionally; `claude-haiku-4-5` **rejects** it (400
  `This model does not support the effort parameter`). Now the parameter is sent only when
  the knob ≠ `"none"`. Validated on load; +test.
- **`runtime.captureIntervalSeconds` config knob** (default 15 s, ≤ `stateRefreshSeconds`) —
  how often a screenshot is pulled from each camera. Validated; +test. `runtime.stateRefresh`
  doc clarified as the *publish* beat vs the *capture* beat.
- **New numbers** (`claude-haiku-4-5`, 9 committed frames, 45 determinate obs, one sample):
  - Baseline: accuracy **62.2%**, harmful-error 2.2%, coverage 95.6%, acc-on-covered 65.1%,
    `out_of_order` 0/8. $0.035, 9 calls. `data/cache/baseline/`.
  - Agent (verification pass): accuracy **57.8%** (**−4.4 pp vs baseline**), harmful-error
    **0.0%**, coverage **100%**, acc-on-covered 57.8%, `out_of_order` 0/8. $0.051, 14 calls.
    `data/cache/agent/`.
  - **The verification pass is net-negative on accuracy on haiku** — it over-commits,
    flipping 4 correctly-`free` machines to `occupied`. Kept in-tree config-gated as a
    studied negative result; **not** the shipped answer. On sonnet (archived `e8de845`) it
    behaved better — the regression is model-specific.
- Docs rewritten with the haiku numbers and the honest framing: `README.md` (results +
  failure mode + hot take), `docs/CHANGELOG.md` (progression, comparison, hot take, new
  verification-run entry), `docs/EVALUATION.md` (Results + limitations), `docs/REPRODUCTION.md`
  (both tables), `docs/DECISIONS.md` (D-0009 gap closed, D-0011 effort, D-0013 status →
  studied negative result), both `docs/trajectories/{baseline,runtime}/*` marked as archived
  sonnet runs.
- Verification: `npm run typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **32/32**; `npm run check:data` — **pass**; `--replay` reproduces both new
  runs exactly.

### 2026-08-28 — Iteration 2: integrator corrections (D-0014)

- **The shipped improvement path.** The vision model can't tell a hard-error display from a
  running cycle → `out_of_order` recall 0/8 for both baseline and the verify pass, = 8 of
  the 19 remaining errors. Fix: a human-in-the-loop correction store the agent treats as
  authoritative.
- `src/eval/corrections.ts` — `Correction { machineId, correctState, scope, note?, by, at }`.
  `scope: "observation"` (one frame) or `"machine"` (durable property — applies to that
  machine in every frame). `loadCorrections()` + `applyCorrections()` (non-mutating override:
  state replaced, confidence → 1). +5 tests.
- `scripts/correct.ts` + `npm run correct -- <frameId> <machineId> <state> [--scope=machine]
  [--note=…]` (`--list` to review). `--corrections` flag on `npm run eval` overlays the store
  before scoring, writes `eval-<mode>-corrected-<date>.json` with a `corrections` count.
- Recorded 3 `machine`-scope corrections via the CLI: `W-04`, `D-02`, `D-06` = "out of
  service" (`data/corrections/img_1819.json`, `img_1821.json`; committed).
- **Result** (`npm run eval -- --mode=agent --split=evaluation --replay --corrections`):
  accuracy **57.8% → 75.6%** (+17.8 pp vs Iter 1, **+13.4 pp vs baseline 62.2%**),
  **`out_of_order` recall 0/8 → 8/8**, harmful-error 0.0% (unchanged), coverage 100%
  (unchanged), **no extra model cost** (corrections applied post-hoc). Report:
  `docs/artifacts/eval-agent-corrected-2026-08-28.json`.
- Honest ceiling: the remaining 11 errors are all `free`→`occupied` over-calls, which are
  time-varying (`observation`-scope) — correcting those is per-frame hand-labelling, not
  durable learning, so left as the limit of this mechanism.
- `docs/DECISIONS.md` D-0014 written; CHANGELOG progression + comparison + hot take + a
  verification-run line updated; README results + "how agents are used"; EVALUATION Results;
  REPRODUCTION; `data/corrections/README.md`.
- **Compliance review** (`hackathon-compliance`, 2 passes):
  `docs/trajectories/compliance/2026-08-28-iteration-2-corrections.md` — **PASS (with risks)**,
  no blockers. Risk fixes applied before commit:
  - **Circularity disclosed.** A correction scores 100% on its own cell by construction;
    "+13.4 pp" = "an integrator overrode 8 of 45 cells to known-correct". No repo-external
    proof the 3 units are physically broken (only the label + author `note`). Added to
    EVALUATION limitations + a "read the delta honestly" paragraph in README + CHANGELOG.
  - **Best config evaluated.** `baseline + corrections` (no verify pass) → **80.0%** acc,
    `out_of_order` 8/8. `docs/artifacts/eval-baseline-corrected-2026-08-28.json` committed;
    added as the **Final (recommended)** column. Deployment note: `verification.enabled=false`.
  - **Asymmetric resources** (Iter 2 gets human overrides) stated explicitly.
- Verification: `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **37/37**; `check:data` — **pass**; `--replay` (± `--corrections`) reproduces
  all four runs exactly (62.2 / 57.8 / 75.6 / 80.0).
- Next (deferred — token budget; resume after limit refresh): portal roles + correction
  write-UI (D-0015) per the user's full-slice choice.

### 2026-08-28 — D-0015 spec: integrator calibration model (doc only)

- Architectural note from the owner, recorded as **D-0015 (Proposed)** in `docs/DECISIONS.md`
  so the portal build and the `site-config.json` schema agree:
  - **Camera** = id + free-text machine-id list it observes (replaces the GT-derived frame-
    membership assist D-0012 in a real deployment) + optional mask PNG
    (**transparent = analyse, solid black `rgb(0,0,0)` = exclude**; may leave only one
    machine's indicator — privacy redaction and analysis-scoping are one tool).
  - **Machine** = optional per-state reference screenshots (few-shot image context) +
    optional per-machine prompt fragment (how to read its indicator). Both optional; without
    them the agent uses its own judgement. No fine-tuning.
  - Agent order: mask → classify declared ids with refs/prompt injected → optional verify
    (off by default) → D-0014 corrections override.
- `data/README.md` mask section updated to the black-`rgb(0,0,0)`-excludes semantics.
- Spec only — no code. `applyMask` today is alpha-driven (opaque → gray patch), which a
  "transparent background + black shapes" PNG already satisfies. Full compliance review folds
  into the next substantive commit.

### 2026-08-28 — 9 evaluation frames committed (author-drawn redactions)

- The frames are of a laundry room the author does not own, so redaction is author-authored,
  not eyeballed: the author painted solid black boxes over identifying content on pristine
  copies kept in the local `data/raw/_reference/`.
- New **`scripts/derive-redactions.ts`** — decodes each reference to raw rgb24 (ffmpeg),
  masks near-black pixels, finds connected components (4-neighbour BFS, min-area filter),
  and writes `data/raw/redactions.json` with each bounding box scaled to produced-frame
  pixel space, `mode:"fill"`. Re-run + `dataset:prepare --force` if references change.
- `npx tsx scripts/derive-redactions.ts` → 9 sources (IMG_1819/1821–1826/8629/8633),
  3–12 boxes each. `npm run dataset:prepare -- --force` burns them in (solid gray, after
  the metadata strip). `npm run check:data` — **pass**.
- The author had overwritten the pristine `data/raw/IMG_1826.JPG` with an annotated copy;
  they supplied the original again and it was re-processed.
- Verified all 9 committed stills box-by-box (Read tool) against the reference image and the
  label file: vendor service sticker / phone, window views and the wall-mounted TV are
  covered; generic décor is intentionally left visible; **every determinate machine's status
  display stays legible**, so labels remain valid; no colored annotation overlay leaked in.
- `.gitignore`: replaced the blanket `/data/public/frames/` hold-out with an allow-list of
  the 9 stills by name. Committed under `data/public/frames/`. Video-derived frames,
  unlabelled stills, and `manifest.json` stay local.
- Docs updated: `data/README.md` (Redaction + Committed frames), `data/public/README.md`,
  `README.md` layout line, `docs/DECISIONS.md` D-0009 (2nd amendment),
  `docs/EVALUATION.md` + `docs/REPRODUCTION.md` limitations, `docs/CHANGELOG.md`.
- **Known gap:** the committed replay cache and the recorded baseline/agent results were
  produced against the earlier lightly-blurred frames. `--replay` still reproduces those
  numbers exactly (cache key = semantic request, not image bytes); a fresh `--live` run on
  the committed frames would land a few points lower where a box clips a display. Refreshing
  the cache with a `--live` pass on the committed frames is pending (API-budget-gated).
- Verification: `npm run typecheck` / `npm run lint` / `npm run build` / `npm run format:check`
  — **pass**; `npm test` — **30/30**; `npm run check:data` — **pass**.
- **Compliance review** (`hackathon-compliance` subagent):
  `docs/trajectories/compliance/2026-08-28-commit-eval-frames.md` — **PASS (with risks)**,
  no eligibility blockers. Risks handled: (1) headline numbers predate these frames →
  disclosed in D-0009 + EVALUATION + REPRODUCTION + CHANGELOG, open item to refresh the
  cache with a `--live` pass before any final results claim; (2) added an inline
  "Caveat (read first)" under `docs/EVALUATION.md` `## Results`; (3) restored the publish-
  authorization clause in D-0009's amendment (redaction ≠ substitute for authorization;
  explicit yes/no open item).
- **Follow-up (integrator feedback):** added per-camera **raster-mask** redaction to
  `scripts/prepare-dataset.ts` — `data/raw/masks/<source>.png`, opaque pixels → solid gray
  patch, painted once per fixed camera and reused (ffmpeg `scale2ref` + `geq` alpha overlay).
  Supersedes rectangles for that source; rectangle path unchanged (9 committed frame hashes
  identical after re-run). Documented in `data/README.md` + D-0009 integrator note.
- **Follow-up (integrator feedback):** frame resolution is now a config knob —
  new `frames` section in `laundry3.config.ts` (`maxStillPx` 1600 / `maxVideoPx` 1280 /
  `videoFps` 1), validated in `src/config/load.ts` (+3 tests, 30 total).
  `scripts/prepare-dataset.ts` and `scripts/derive-redactions.ts` read
  `config.frames.*` as defaults (CLI flags still override). `frames.maxStillPx` is the one
  resolution the pipeline, the per-camera mask, and the runtime all share. Documented in
  `docs/CONFIGURATION.md`.

### 2026-08-28 — Portal page (End-to-End)

- `src/portal/room-status.ts` — `buildRoomStatus()` fuses the committed eval report
  (`docs/artifacts/eval-agent-2026-08-28.json`) + the roster into a per-machine room view:
  for each machine, the most confident *actionable* observation across all frames, else the
  best `unknown`. No API call → `npm run build` prerenders the page. +4 tests (27 total).
- MobX finally wired to real state: `ExampleStore`/`ExampleCounter` deleted;
  `MachinesStore` (`washers` / `dryers` / `counts` / `freeIds` computeds) hydrated from the
  server component via `RootStoreHydration.room`.
- `src/app/page.tsx` (Server Component) → `<StoreProvider initialData={{ room }}>` →
  `src/components/room-status.tsx` (`observer`): washers/dryers grids, colour by state,
  "confirm on arrival" on free/unknown, provenance footer (model + report path).
- Screenshots: `docs/assets/portal-top.jpg`, `portal-machines.jpg`. Wired into the README.
- Verification: `typecheck` / `lint` / `build` pass; `npm test` **27/27**.

### 2026-08-28 — Packaging pass (deliverables)

- **README** rewritten for the submission: intended user + bottleneck + why it matters, the
  built scope (baseline + Iteration 1) with the results table, **main failure mode + hot
  take**, how each agent/skill/subagent is used, a key-free quick-start (`--replay`).
- **`docs/CHANGELOG.md`** closed with a "Main contribution, failure mode, and hot take"
  section (deliverable #1 requirement).
- **Agent trajectories** (deliverable #4): added `docs/trajectories/baseline/2026-08-28-img_1823.md`
  (the one-call baseline calling a broken machine `free`) alongside the runtime trajectory;
  `docs/trajectories/README.md` updated to list what's present and note it's all
  `--replay`-reproducible.
- No code change; no API cost.

### 2026-08-28 — Cost controls + Iter-1 review fixes

- API budget is tight → cut future `--live` cost without touching the recorded runs:
  - **Default model → `claude-haiku-4-5`** ($1/$5 vs sonnet-5 $2/$10). `defaults.ts` +
    `laundry3.config.ts` + `docs/CONFIGURATION.md` + D-0011.
  - `AnthropicVisionClient` `max_tokens` 4000 → 1500 (responses are ~300–700 tokens).
  - `VisionResponse.model` is now persisted in the cache; `FramePrediction.meta.model` and
    the report's `model` field derive from the responses, so `--replay` of the sonnet-5
    cache correctly reports `claude-sonnet-5` even with the config on haiku. Backfilled the
    27 existing cache files with `"model": "claude-sonnet-5"`.
  - Recorded baseline + Iteration 1 stay on `claude-sonnet-5` and are reproduced free via
    `--replay`. Multi-sample averaging stays deferred (budget).
- Compliance re-review of Iter 1 (**CHANGES REQUIRED**) — applied:
  - **G9 blocker:** removed the "directionally consistent across 3 samples" claim
    (`docs/CHANGELOG.md`, `docs/WORKLOG.md`) — only one sample per mode is committed. Now
    stated as one unaveraged observation each.
  - `docs/REPRODUCTION.md`: added a "Recorded agent run" results table; fixed `npm test`
    expectation `10/10` → `23/23`.
  - `docs/DECISIONS.md` D-0013 — the agent pipeline structure (verification pass + 0.35
    abstain floor, and the removed 0.7-gate dead-end).
  - Renamed `meta.needsVerification` → `meta.verifiedMachineIds` (it holds the *verified*
    ids); agent report regenerated via `--replay` (no cost).
- Verification: `typecheck` / `lint` pass; `npm test` **23/23**; both `--replay` runs
  reproduce (31.1% / 31.1%), reports byte-stable.

### 2026-08-28 — Agent Iteration 1: verification pass

- `runAgent` fleshed out: (1) whole-frame classify (baseline-equivalent); (2) **verification
  pass** — a second focused vision call on `unknown` / low-confidence machines, naming them
  and listing explicit out-of-order / occupied / free cues, incl. the author's new edge case
  ("dim or dead 7-segment segments — read the shape, don't over-read a missing segment as an
  error"); (3) near-guess abstain (only overrides an *answered* machine below 0.35, not the
  0.7 verify trigger).
- **Dead-end found + removed:** first version abstained on any machine below the 0.7 verify
  threshold → coverage collapsed to ~4% (dev observation, not separately archived). The model's own
  `unknown` is the abstention signal; a separate gate only helps at a much lower floor.
- **Result** (`npm run eval -- --mode=agent --split=evaluation --live`, 18 calls, $0.17):
  accuracy **31.1%** (= baseline, tied within noise), harmful-error **8.9%** (baseline
  11.1%), coverage 51.1% (baseline 60.0%), acc-on-covered **60.9%** (baseline 51.9%),
  `out_of_order` **2/8** (baseline 0/8). Kept — trades coverage for safety + precision +
  catching broken machines, aligned with the primary user value. Next: ROI crops to lift
  coverage.
- **One sample per mode** — `claude-sonnet-5` is stochastic and each delta is a single
  observation. The accuracy figures are equal (within noise); the harmful-error /
  acc-on-covered / `out_of_order` differences are larger but unaveraged. Multi-sample
  averaging deferred (API budget) and listed as an open limitation.
- Edge case noted in `docs/PROBLEM.md` + `docs/EVALUATION.md` (partial/dim indicator).
- `data/cache/agent/` force-added; `--replay` verified frames-absent. `docs/CHANGELOG.md`
  Iter 1 row + comparison table filled.
- Verification: `typecheck` / `lint` pass; `npm test` **23/23**.

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
