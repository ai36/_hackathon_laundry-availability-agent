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
| Baseline | Single `claude-haiku-4-5` vision call per frame on the whole downscaled + author-redacted image; given the frame's machine-id list + numbering convention, no ROI / calibration / memory / verification. `npm run eval -- --mode=baseline --split=evaluation --live`. | **accuracy 62.2%**, harmful-error 2.2%, coverage 95.6%, acc-on-covered 65.1% (45 determinate obs, 9 frames). Report: `docs/artifacts/eval-baseline-2026-08-28.json`; replay cache: `data/cache/baseline/` (9 files, reproduces frames-absent). Cost $0.035, 16.6k in / 3.7k out. Single sample. | The model reads lit displays confidently: it gets the genuinely-occupied machines right (10/10) but **over-calls `free` machines with a lit standby panel as `occupied`** (7/27) and **never identifies `out_of_order`** (0/8 — the "E" error code reads as an active cycle). One harmful error (an `out_of_order` machine called `free`). Headroom is in `free` precision and in `out_of_order`. |
| Iteration 1 (P0) | **Verification pass**: after the whole-frame classify, a second focused vision call on the machines that came back `unknown` or low-confidence, naming them and listing explicit out-of-order / occupied / free cues (incl. "dim or dead 7-segment segments — read the shape, don't over-read"). Its answers override pass 1. `npm run eval -- --mode=agent --split=evaluation`. | accuracy **57.8%** (baseline 62.2% — **−4.4 pp**), **harmful-error 0.0%** (baseline 2.2%), coverage **100%** (baseline 95.6%), acc-on-covered 57.8% (baseline 65.1%), `out_of_order` **0/8** (unchanged). 14 calls, $0.051 (1.4× baseline). Single sample. | **Mixed — net-negative on the primary metric.** The verify pass resolves the 2 baseline `unknown`s and clears the one harmful error, but it *over-commits*: it flips 4 correctly-`free` machines to `occupied`, so raw accuracy drops. It still cannot tell a broken machine from a running one. On `claude-sonnet-5` (archived at commit `e8de845`, on the earlier lightly-blurred frames) the same pass looked better — harmful 11.1%→8.9%, `out_of_order` 0/8→2/8 — but on the cost-appropriate model it is not a clear win. **Not shipped as the final answer.** Next: a human-in-the-loop correction store (Iteration 2), which is what actually moves `out_of_order`. |
| Iteration 2 (P0) | **Integrator corrections** (D-0014). The integrator marks a machine wrong once; the correction is stored (`data/corrections/`) and applied as an authoritative override. `observation`-scope fixes one (frame, machine); `machine`-scope (for durable properties like `out_of_order`) applies to that machine in **every** frame. `npm run eval -- --mode=agent --corrections`. | **3 `machine`-scope corrections** (`W-04`, `D-02`, `D-06` = "out of service") → accuracy **57.8% → 75.6%**, **`out_of_order` recall 0/8 → 8/8**, harmful-error 0.0% (unchanged), coverage 100% (unchanged), **no extra model cost** (post-hoc). Report: `docs/artifacts/eval-agent-corrected-2026-08-28.json`; `--replay --corrections` reproduces it. | **Kept — the shipped improvement path.** The vision model can't distinguish a hard-error display from a running cycle; one durable fact per broken machine fixes it in every angle and every future capture. Ceiling: the remaining 11 errors are all `free`→`occupied` over-calls, which are time-varying (`observation`-scope) — correcting those is per-frame hand-labelling, not learning, so they're left as the honest limit. |
| Iteration 3 (P1) | _TBD — temporal memory / change-detection to cut the `free`→`occupied` over-calls._ | _[new result]_ | _[kept / revised / removed]_ |
| Final | _TBD — combine what worked._ | _[final result]_ | _Main contribution: …_ |

## Baseline → Iteration 1 → Iteration 2

**One sample per mode** (`claude-haiku-4-5`; stochastic, so a single run shifts these a few
points — multi-sample averaging deferred on API budget). All score the same 45 determinate
observations on the same 9 committed frames; all `--replay`-reproducible from `data/cache/`.

| Metric | Baseline | Iter 1 (verify) | Iter 2 (verify + corr.) | **Final: classify + corr.** |
| --- | --- | --- | --- | --- |
| Per-machine accuracy (determinate GT, n=45) | 62.2% | 57.8% | 75.6% | **80.0%** |
| Harmful-error rate | 2.2% | 0.0% | 0.0% | **0.0%** |
| Coverage | 95.6% | 100% | 100% | 95.6% |
| Accuracy on covered | 65.1% | 57.8% | 75.6% | **83.7%** |
| `out_of_order` recall | 0/8 | 0/8 | 8/8 | **8/8** |
| Model cost per frame | ~$0.004 | ~$0.006 | ~$0.006 | **~$0.004** |

**Iteration 1 (verification pass)** is *not* an improvement on this model — it over-commits,
flipping correctly-`free` machines to `occupied`, so accuracy drops 4.4 pp. Kept in-tree,
config-gated (`agent.verification.enabled`), as a studied negative result.

**Iteration 2 (integrator corrections)** is the improvement — but stacked on the regressive
verify pass it only reaches 75.6%. The **strongest config drops the verify pass**:
`npm run eval -- --mode=baseline --split=evaluation --replay --corrections` →
**80.0%** (`docs/artifacts/eval-baseline-corrected-2026-08-28.json`). For deployment, set
`agent.verification.enabled = false` and keep the corrections.

**How to read the delta.** The corrections are **human-supplied ground truth applied as an
override**, not a model capability gain — and the Iter 2 / Final columns get a resource the
Baseline / Iter 1 columns do not. A correction always scores perfectly on its own cell *by
construction* (its value is label-consistent), so "+13.4 / +17.8 pp" is really "an integrator
chose to override 8 of 45 cells to their known-correct value." The honest reading: (a) the
`out_of_order`-recall failure is real and the model doesn't fix it, (b) one durable fact per
broken unit removes it in every angle and every future capture at zero model cost, (c) there
is no repo-external proof (service ticket, photo) that `W-04` / `D-02` / `D-06` are physically
out of service — only the eval label and the author's `note`. The remaining 11 errors are all
time-varying `free`→`occupied` over-calls, which `machine`-scope corrections can't help.

## Main contribution, failure mode, and hot take

**Main contribution.** Two things. (1) The **evaluation frame** that made a plausible-looking
agent step (the verification pass) show up as a regression instead of shipping: `unknown` +
`out_of_order` as first-class states, `harmful`-error scored separately (D-0006), a fair
symmetric baseline (D-0012), key-free `--replay`. (2) The **integrator-correction store**
(D-0014) — the mechanism that actually moved the metric the model can't: 3 durable "out of
service" facts an integrator records once take accuracy 62.2% → 75.6% and `out_of_order`
recall 0/8 → 8/8 at no extra model cost. The agentic win here is *knowing when to stop
asking the model and let a human write one authoritative fact.*

**Main failure mode.** The verification pass *over-commits*. Asked to re-examine a
low-confidence machine, `claude-haiku-4-5` resolves the doubt by picking the more eventful
label — a lit standby panel becomes `occupied`, an "E" error code becomes `occupied` — so
the pass trades 2 recovered `unknown`s for 4 new `free`→`occupied` errors and never reaches
`out_of_order`. On `claude-sonnet-5` (archived, earlier frames) the same prompt behaved
better; the regression is model-specific and only shows up when you actually run the cheaper
model you intend to deploy.

**Hot take.** The highest-leverage work here was not any agent change — it was building the
metric before building the agent. A verification pass that looked like a safety win on a
strong model turned out **net-negative on accuracy** on the model we'd actually ship. Only
because `harmful` error, coverage, and `out_of_order` were scored separately could we see
that clearly and decline to ship it, instead of celebrating a −4-point regression as
"more cautious". Decide what each error costs the user, encode it in the metric, then let
the metric — not the demo — tell you whether the agent is better.

## Verification runs

Record the result of each infra verification here (append, newest first).

### 2026-08-28 — portal: collapsible lists everywhere, tenant summary, editor rows, icons

- `MachineGrid` gains a `collapsible` prop + always shows the item count in the heading
  (`Washers (16)`); disclosure `<button>` with `aria-expanded`/`aria-controls`, grid stays
  mounted behind `hidden`. Enabled on `/integrator` and `/tenant`.
- Tenant status card (`room-view.tsx`) leads with `Washers free N / 16` + `Dryers free
  N / 16` (mint when > 0, muted at 0); `in use · out of order · unknown` demoted to a
  single small line; `Available now:` id list kept.
- Settings: "Machines (32)" split into collapsible `Washers (16)` + `Dryers (16)`
  (`RosterSection`, type-fixed add row); "Site overview" made collapsible. Four collapsible
  sections, all closed by default.
- Editor cards restructured — fields → text field → a dedicated `save` + delete action row
  (was `ml-auto` that wrapped to an orphaned second line on narrow screens). `Button` base
  `min-h-9`→`min-h-10` (40 px); new `ICON_BUTTON` export (40×40); delete glyph 14→24 px;
  inline glyphs 14→16; `Section` chevron 16→18, toggle `min-h-10`. Supersedes the prior
  "~36px" target bar — D-0001 amendment.
- Camera-id placeholders `cam-1`→`C-01` + a convention note (matches `W-`/`D-`); not
  enforced (`SITE_ID_RE` unchanged).
- Presentational only. `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **51/51**; `check:data` — **pass**. Chrome: collapse toggles verified, no
  page overflow. `docs/assets/portal-{top,machines,settings}.jpg` regenerated.

### 2026-08-28 — portal: visual-rhythm + WCAG 2.2 pass (`web-design-guidelines` skill)

- Ran the connected `web-design-guidelines` skill (Vercel Web Interface Guidelines) over
  `src/components/**` + `globals.css`; fixed every finding. Target size: AA + headroom
  (36px), agreed with owner.
- Rhythm: one spacing scale applied uniformly (`p-4` panels / `p-3` rows, `space-y-6` body,
  `gap-2/3/4`, icons `14`/`16`, text collapsed to `text-xs`/`text-sm` + new `--text-2xs`).
- a11y: `Button` `min-h-9` + shared `buttonClasses()`; `Switch` 36px hit area + required
  `label`→`aria-label`; new `LinkButton` kills `<a><button>` nesting; `aria-hidden` on
  decorative icons; `Section` `aria-expanded`/`aria-controls`; `AppShell` skip-link +
  `aria-label` navs + safe-area; `prefers-reduced-motion` block; `theme-color`; `role="alert"`
  on errors; `autocomplete="off"`/`spellCheck={false}` on code inputs; `tabular-nums` counts.
- No business-logic / API / data-model change; one render change — the collapsible
  `Section` now always mounts its body behind `hidden` (needed for `aria-controls`), so
  collapsed `MachineRow` / `CameraRow` subtrees mount.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. Route table unchanged. Screenshots regenerated.
- a11y spot-check (Chrome DevTools console, `/tenant`):

  ```js
  ({
    skipLink: document.querySelector('a[href="#main"]')?.textContent.trim(),
    mainHasId: !!document.getElementById("main"),
    navLabels: [...document.querySelectorAll("nav")].map((n) => n.getAttribute("aria-label")),
    reducedMotion: [...document.styleSheets].some((ss) => {
      try {
        return [...ss.cssRules].some((r) => r.conditionText?.includes("prefers-reduced-motion"));
      } catch {
        return false;
      }
    }),
  });
  // → { skipLink: "Skip to content", mainHasId: true,
  //     navLabels: ["Primary", "Primary"], reducedMotion: true }
  ```

### 2026-08-28 — portal: "Lumina Wash" design system (`docs/design-reference/`)

- Owner-supplied reference (`docs/design-reference/lumina_wash/DESIGN.md` + screens)
  implemented: `globals.css` full token set as Tailwind v4 `@theme` vars, single dark
  theme, `Inter` via `next/font`, `.dot-*`/`.card-*`/`.glow-*` status helpers. Removed
  `html { font-size: 150% }` (reference defines its own px scale). D-0001 amendment.
- New `src/components/ui/app-shell.tsx` — left rail (`md+`) / bottom bar (mobile), 3 items
  → the 3 URL routes. `Button` / `field` / `switch` / `Section` / `PageShell` /
  `MachineCard` / grids restyled to tokens.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. Chrome @ 486 px CSS viewport, all 3 pages + editors expanded:
  `scrollWidth == clientWidth`, 0 overflow offenders, all controls visible. Route table
  unchanged (`○ /`, `○ /tenant`, `ƒ /integrator{,/settings}`, `ƒ /api/*`).
  `docs/assets/portal-{top,machines,settings}.jpg` regenerated.

### 2026-08-28 — portal: design system + auto-refresh (radix-ui, lucide-react)

- Deps `radix-ui@1.6.7` + `lucide-react@1.35.0` (portal-only). New `src/components/ui/` kit
  (`PageShell` / `Button` / `Section` / `field` / `switch`) — all pages rebuilt on it for a
  consistent look.
- Machines editor: table → stacked cards; every control visible at a 575 px viewport, no
  page horizontal scroll.
- Auto-refresh: `RefreshControl` (manual button + Radix `Switch` at
  `runtime.stateRefreshSeconds`) → `POST /api/refresh` (captures each camera's stub feed,
  runs the agent with a key, else re-fuses).
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. `ƒ /api/refresh` added; `○ /tenant` still static.

### 2026-08-28 — portal: URL routes, font 150%, mobile responsiveness

- URL-based routing: `/` → `/tenant` (static), `/integrator` (console), new
  `/integrator/settings` (Machines + Cameras editors). `html` font 200% → **150%**.
- Mobile: `body { overflow-x: clip }` backstop; machines table `min-w` reduced; header
  button groups wrap. Verified at a 486 px CSS viewport — no page-level horizontal scroll on
  any route, zero real offenders.
- Screenshots regenerated; README / REPRODUCTION / DECISIONS D-0015 route names updated.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**.
  Routes: `○ /`, `○ /tenant`, `ƒ /integrator`, `ƒ /integrator/settings`, `ƒ /api/*`.

### 2026-08-28 — integrator console: Cameras CRUD + upload; layout fixes (D-0015)

- `src/eval/site-config.ts` (`data/site-config.json`; validate/sort; `parseMachineIds`;
  upsert/remove), `GET/POST/PATCH/DELETE /api/cameras`, `POST /api/upload` (multipart,
  jpeg/png/webp ≤ 4 MB → `data/site-config/<id>/`, git-ignored), `CamerasEditor`. +5 tests
  (51 total).
- Trust-boundary docstrings mirrored into `/api/machines`, `/api/cameras`, `/api/upload`.
- Layout: `max-w-[1100px]` (px, no 2×-scale overflow), `sm:grid-cols-2`, editors are
  `<details>` collapsed. Screenshots regenerated; stale settings screenshot removed.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**.
  Routes: `ƒ /api/cameras`, `ƒ /api/upload` added.

### 2026-08-28 — integrator console: Machines CRUD (D-0015)

- `src/eval/roster.ts` (typed roster + validate/sort + upsert/remove; `promptFragment` per
  machine), `POST/PATCH/DELETE /api/machines` writing `data/machines.json`,
  `MachinesEditor` table on `/integrator`. +6 tests (46 total).
- Curl round-trip (add → patch → traversal-blocked → delete) leaves `data/machines.json`
  byte-identical. `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` —
  **46/46**. Routes: `ƒ /api/machines` added.
- Next: cameras CRUD + image upload, per-machine reference screenshots.

### 2026-08-28 — portal: 2× font + split tenant / integrator pages

- `html { font-size: 200% }`; px-literal text classes → `text-xs`; `max-w-6xl`; responsive
  grid; `overflow-wrap: anywhere` + `break-words` so nothing overflows.
- `/` = tenant `RoomView` (state only, still `○`). `/integrator` = `IntegratorView`
  (`force-dynamic`) with the mark-wrong loop, refresh button, and a Site-overview section.
  Shared `MachineCard` extracted; old `room-status.tsx` component + `?role=` toggle removed.
- Routes: `○ /`, `ƒ /integrator`, `ƒ /api/corrections`, `ƒ /api/room`.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **41/41**;
  both pages checked in Chrome.
- Next: machines + cameras CRUD on `/integrator`, `data/site-config.json` schema (D-0015).

### 2026-08-28 — portal: full roster + refresh + integrator settings panel

- `buildRoomStatus` iterates the whole 32-machine roster; `D-11…D-16` (not in the mock
  photos) show as `unknown` / `seenIn 0`. +1 test (41 total).
- `GET /api/room` (`src/app/api/room/route.ts`) + a "↻ refresh recognition" button re-fuse
  the room without an API call (the D-0016 re-capture hook). "Integrator settings" panel:
  roster stats + mock-camera → machine map + the D-0015 not-built note.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **41/41**;
  `check:data` — **pass**. Build routes: `○ /`, `ƒ /api/corrections`, `ƒ /api/room`.

### 2026-08-28 — portal: integrator role + clickable correction loop

- `buildRoomStatus` overlays D-0014 corrections (default report → `eval-baseline-2026-08-28.json`
  so the overlay is visible); `MachineView.corrected` / `.correction`; +1 test (38 total).
- `writeCorrection()` extracted from the CLI into `src/eval/corrections.ts`, shared with a
  new `POST /api/corrections` route (Node runtime; `GET` summarises). Build unchanged:
  `○ /`, `ƒ /api/corrections`.
- `?role=integrator` → per-card confidence + source + "✕ mark wrong" (state picker + note +
  durable toggle → `scope: machine`); submit swaps in the API's re-fused room, card flips
  with an integrator badge. Tenant `/` = state only.
- Verified in Chrome end-to-end (3 committed corrections shown; a test mark-wrong flipped a
  card and updated counts live; test correction removed). Screenshots refreshed.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **38/38**;
  `check:data` — **pass**. Meets D-0016 P0 (judge walks the loop key-free).

### 2026-08-28 — cache refreshed on `claude-haiku-4-5` + committed frames

- Deleted the archived `claude-sonnet-5` cache (still in git at `e8de845`) and re-ran
  `--live` on `claude-haiku-4-5` against the committed author-redacted frames, so the cache,
  the reports, and the frames now all match. **Baseline** 62.2% acc / 2.2% harmful / 95.6%
  coverage / 0/8 `out_of_order`, $0.035, 9 calls. **Agent (verify)** 57.8% acc / 0.0%
  harmful / 100% coverage / 0/8 `out_of_order`, $0.051, 14 calls. Reports regenerated;
  `data/cache/{baseline,agent}/` re-committed.
- `AnthropicVisionClient` no longer hard-codes `output_config.effort` — new
  `agent.visionEffort` knob (`"none"` default; haiku rejects the parameter, so `"none"`
  omits it). `runtime.captureIntervalSeconds` knob added (camera screenshot cadence,
  default 15 s, ≤ `stateRefreshSeconds`). Both validated on load, +tests.
- Result write-up rewritten honestly: the verification pass is **net-negative on accuracy**
  on haiku (−4.4 pp) — kept in-tree config-gated as a studied negative result, not shipped.
  Progression / comparison / hot-take sections updated. The "known gap" from the previous
  entry is **closed** — cache and committed frames are consistent.
- **Iteration 2 — integrator corrections (D-0014).** New `src/eval/corrections.ts`
  (`observation` / `machine` scope, authoritative override), `scripts/correct.ts`
  (`npm run correct`), `--corrections` flag on `run-eval`. Recorded 3 `machine`-scope
  corrections (`W-04`, `D-02`, `D-06` = out of service). `npm run eval -- --mode=agent
  --split=evaluation --replay --corrections` → accuracy **75.6%** (+17.8 pp over Iter 1,
  +13.4 pp over baseline), **`out_of_order` 8/8**, harmful 0.0%, coverage 100%, no extra
  model cost. Report: `docs/artifacts/eval-agent-corrected-2026-08-28.json`. +5 tests.
- `npm run typecheck` / `npm run lint` / `npm run build` / `npm run format:check` — **pass**;
  `npm test` — **37/37**; `npm run check:data` — **pass**; `--replay` (± `--corrections`)
  reproduces all three runs exactly.

### 2026-08-28 — 9 eval frames committed (author-drawn redactions)

- New `scripts/derive-redactions.ts`: recovers the frame author's hand-drawn black
  redaction boxes from `data/raw/_reference/*.jpg` (connected-component analysis) and writes
  `data/raw/redactions.json` as `mode:"fill"` rectangles in produced-frame pixel space.
- `npx tsx scripts/derive-redactions.ts` → 9 sources, 3–12 boxes each;
  `npm run dataset:prepare -- --force` → 45 frames, `npm run check:data` **pass**.
- Visually verified all 9 committed stills box-by-box against reference + label file:
  décor-free identifying content covered (vendor sticker/phone, windows, wall TV); every
  **determinate** machine's status display still legible; no colored annotation leaked in.
- `.gitignore` now allows the 9 labelled eval stills by name; committed under
  `data/public/frames/`. Video-derived + unlabelled frames stay local.
- Compliance subagent: **PASS (with risks)**, no blockers —
  `docs/trajectories/compliance/2026-08-28-commit-eval-frames.md`. Risk fixes applied:
  inline caveat on the EVALUATION Results header; publish-authorization clause restored in
  D-0009; cache-refresh tracked as an open item.
- Integrator-feedback follow-ups (same change set):
  - per-camera **raster mask** redaction (`data/raw/masks/<source>.png`) in
    `prepare-dataset.ts` — paint once per fixed camera, opaque → gray patch; supersedes
    rectangles. Rectangle path unchanged (9 frame hashes identical).
  - frame resolution is now a **config knob** — `frames.{maxStillPx,maxVideoPx,videoFps}` in
    `laundry3.config.ts`, validated on load; both scripts read it as defaults.
    `frames.maxStillPx` is the shared resolution for pipeline + mask + runtime.
- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**; `npm test` — **30/30**.
- **Known gap:** committed replay cache + recorded results predate these heavier boxes.
  `--replay` reproduces the recorded numbers exactly (image-independent hash); a fresh
  `--live` on the committed frames will differ slightly. Cache refresh pending (budget-gated).

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

### 2026-08-28 — portal page

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass** (page prerenders from the
  committed report, no API call); `npm test` — **27/27** (+4 for `room-status`).
- `npm run dev` → the room view at `/`; screenshots in `docs/assets/`.

### 2026-08-28 — cost controls + Iter-1 review fixes

- `typecheck` / `lint` pass; `npm test` **23/23**.
- Default `agent.visionModel` → `claude-haiku-4-5` (cost); `max_tokens` 4000 → 1500;
  `VisionResponse.model` persisted in the cache; 27 cache files backfilled with
  `claude-sonnet-5`. Both `--replay` runs still reproduce 31.1% / 31.1% and the report
  regenerates byte-identically.
- Compliance re-review of Iteration 1 was **CHANGES REQUIRED** (unsupported "3 samples"
  claim) — fixed to "one unaveraged sample per mode"; added a Recorded-agent-run table to
  `docs/REPRODUCTION.md`, D-0013 for the pipeline structure, and renamed the
  `verifiedMachineIds` meta field.

### 2026-08-28 — agent Iteration 1 (verification pass)

- `npm run eval -- --mode=agent --split=evaluation --live` — 18 `claude-sonnet-5` calls
  (9 classify + 9 verify), $0.17. **accuracy 31.1% · harmful-error 8.9% · coverage 51.1% ·
  acc-on-covered 60.9% · `out_of_order` 2/8**. Report:
  `docs/artifacts/eval-agent-2026-08-28.json`; replay cache: `data/cache/agent/` (18 files,
  committed, reproduces frames-absent).
- Removed dead-end: abstaining on any machine below the 0.7 verification threshold →
  coverage collapsed to ~4% (dev observation, not archived). Recalibrated to a 0.35 floor
  on *answered* machines only.
- `typecheck` / `lint` pass; `npm test` **23/23**.

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
