# Decision Log

Lightweight ADRs. One entry per decision that would otherwise need re-explaining.
Format: ID, date, status, context, decision, consequences.

---

## D-0001 — Technology stack and versions

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The hackathon brief asks for a reproducible project a real person could run
from a clean environment. The requested stack is TypeScript + Node + Next.js + Tailwind CSS
+ MobX, on "current compatible versions".

**Decision.** Use the version set that `create-next-app@latest` pins, rather than the
newest published version of every package:

| Package | Version | Note |
| --- | --- | --- |
| node | 24.x (dev machine: 24.11.1) | LTS-line, supported by Next 16 |
| next | 16.3.3 | latest stable |
| react / react-dom | 19.2.8 | required by Next 16 |
| typescript | ^5 | `create-next-app` default; TS 7.x exists but is not yet vetted against Next 16 + `eslint-config-next` |
| tailwindcss | ^4 via `@tailwindcss/postcss` | CSS-first config (`@import "tailwindcss"` in `globals.css`) |
| eslint | ^9 + `eslint-config-next` 16.3.3 | flat config in `eslint.config.mjs` |
| mobx | ^7 | latest major |
| mobx-react-lite | ^5 | peer deps: `mobx ^7`, `react ^18 || ^19` — compatible |
| prettier | ^3 + `prettier-plugin-tailwindcss` | formatting only; ESLint handles lint |

**Consequences.** The lockfile (`package-lock.json`) is the source of truth; reproduction
uses `npm ci`. If we later need TypeScript 7 or newer majors, that is its own decision
entry with its own verification run.

---

## D-0002 — MobX store architecture

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** Next.js App Router renders on the server. A single shared MobX store instance
across server requests would leak state between users; observer subscriptions created during
SSR would never be disposed.

**Decision.**

- `RootStore` is the single composition root; domain stores hang off it and receive a
  back-reference.
- `initRootStore()` returns a **fresh store per render on the server** and a **memoized
  singleton in the browser**.
- `StoreProvider` (a `"use client"` component) holds the instance in a `useRef` and is
  mounted once in `app/layout.tsx`.
- `enableStaticRendering(typeof window === "undefined")` disables observer tracking on the
  server.
- `configure({ enforceActions: "always" })` — state may only change inside actions.
- A `RootStoreHydration` type is threaded through `initRootStore` so server-fetched data
  can seed the client store later without rework.

**Consequences.** Server Components stay the default; anything that reads store state must
be a Client Component wrapped in `observer`. The scaffolding `ExampleStore` / `ExampleCounter`
were replaced by `MachinesStore` (2026-08-28): `src/app/page.tsx` (Server Component) builds
the room view from the committed eval report and passes it as `RootStoreHydration.room` to
`<StoreProvider>`; `src/components/room-status.tsx` reads it via `observer`.

---

## D-0003 — Connected agent skills

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The hackathon rewards purposeful use of agent capabilities (context, tools,
memory, verification, skills, orchestration).

**Decision.** Connect two skills up front:

- **`find-skills`** — lets the agent search the skills.sh ecosystem (`npx skills find`) and
  install more skills on demand as concrete needs appear during the build.
- **`grillme`** (`jekudy/grillme-skill@grillme`) — Socratic interview skill. Used to pin
  down the problem statement, user, bottleneck, and evaluation before writing feature code,
  and to stress-test claims before they go in the report.

See `docs/SKILLS.md` for usage. Any additional skill installed later gets its own decision
entry and a worklog line.

**Consequences.** Skills run with full agent permissions; each is reviewed before use.
`grillme` is MIT-licensed (source: github.com/jekudy/grillme-skill) and passed
Gen / Socket / Snyk assessments at install time. `find-skills` is part of the base
Claude Code skill set.

---

## D-0004 — Git workflow and automated compliance review

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The project lives at `git@github.com:ai36/_hackaton_laundry3.git`. The user
integrates `main` manually and wants significant progress visible on GitHub as it happens.
Separately, every change must stay within the hackathon rules, checked by an independent
agent rather than only self-review.

**Decision.**

- **Branch model:** all agent work on `dev`; `main` is off-limits to the agent (user merges
  manually). Enforced by a PreToolUse(Bash) hook, `.claude/hooks/git-guard.mjs`, that blocks
  `commit` / `merge` / `rebase` / `push` targeting `main` / `master`. The hook is Node
  (no `jq` on the machine) and keyed off `git branch --show-current` + command-string
  matching.
- **Push cadence:** significant changes are committed and pushed to `origin/dev` after they
  pass the compliance review.
- **Compliance review:** a dedicated `hackathon-compliance` subagent
  (`.claude/agents/hackathon-compliance.md`) reviews each diff against
  `docs/HACKATHON-RULES.md` — ground rules (eligibility BLOCKERS), scoring alignment
  (RISKS), and process hygiene (worklog / changelog / decisions coverage). It is read-only
  (`Read`, `Grep`, `Glob`, `Bash`) and returns PASS / PASS WITH RISKS / CHANGES REQUIRED.
- **Rules in-repo:** the hackathon PDF is transcribed to `docs/HACKATHON-RULES.md` so the
  reviewer and judges work from a version-controlled copy.

**Consequences.** Slightly slower iteration (a review step per push) in exchange for a
standing check against the rubric. The hook can produce a false block on an exotic `git`
invocation; if that happens, adjust the matcher in `git-guard.mjs` rather than disabling the
hook. CLAUDE.md "System rules" section and the `git-workflow` / `compliance-review` memory
entries carry the same rules across sessions.

---

## D-0005 — Product scope and evaluation approach (laundry3)

- **Date:** 2026-08-28
- **Status:** Accepted (from the scoping interview; see `docs/PROBLEM.md`,
  `docs/EVALUATION.md`). **Primary-metric portion superseded by D-0006** — the state space
  is `free`/`occupied`/`out_of_order`/`unknown`, not a binary, and the metric now includes
  harmful-error rate and coverage.

**Context.** Solo build, hard deadline **2026-08-30 12:00 UTC-7**. The product is a
laundry-room machine-availability agent; the full vision (calibration + runtime CV +
temporal memory + timers + reservations + portal) is far more than fits the deadline.

**Decision.**

- **Core (P0):** an agent that turns a frame (+ prior state) into a **verified per-machine
  status list** (state, confidence, rationale) via a multi-step graph with an explicit
  verification pass, plus a **calibration** step that builds a per-site config (per-machine
  ROIs, reference crops, few-shot exemplars, thresholds) from human-confirmed frames — **no
  model fine-tuning**.
- **Primary metric:** overall per-machine free/occupied accuracy on a labelled frame set.
  Secondary: tokens/cost per frame.
- **Baseline:** single Claude vision prompt on the whole frame, same metric, same frames.
  Contextual baseline: the manual "walk over and check" process (narrative only).
- **Vision engine:** Claude vision API, with a `--replay` mode that re-runs scoring from
  cached responses (no key, no cost) so judges reproduce the number; a small `smoke` subset
  runs live.
- **Data:** the author's own real shared laundry room (multi-angle stills + a short
  time-ordered series), shot with no people, tightly framed, identifying details removed;
  the "person in frame" hard case uses a synthetic/augmented frame.
- **Measured iterations inside P0:** the changelog needs at least two real iterations with
  the same-metric evidence, so **Iteration 1 (per-machine ROI calibration config)** and
  **Iteration 2 (explicit verification pass for low-confidence machines)** are part of P0,
  not "if time". Iteration 3 (temporal memory / change-detection) stays P1.
- **Deferred:** change-detection + cycle timers + abandoned-laundry (P1); reservation flow +
  notifications (P2); hardware integration, fine-tuning, calibration-drift handling
  (out of scope, documented as limitations).
- **Runtime human review:** none for the hackathon — calibration-reviewed only. A wrong
  "free" is low harm (reproduces today's wasted trip; no hardware/money). Portal shows
  confidence + a "confirm on arrival" caveat. Runtime review queue is a documented
  production path. (See `docs/PROBLEM.md` ground rule 05 section.)

**Consequences.** The agentic contribution must be visible in the changelog as per-step
experiments (add ROI calibration → add verification → add memory), each measured with the
same metric, or the 30-point "Agent Solution & Engineering" criterion is at risk. Dataset
size is the main threat to a stable metric; mitigated with a disjoint calibration/eval split
and multiple angles × time points.

---

## D-0006 — Machine state space, label schema, and abstention scoring

- **Date:** 2026-08-28
- **Status:** Accepted (supersedes the "free vs occupied" binary in D-0005). **Amended
  2026-08-28:** state space is 4-way — `out_of_order` added (see the amendment note below);
  label keys are `camelCase` (`frameId`, `frameConditions`, `machineId`, `gtDeterminate`,
  `observationNotes`), matching `src/eval/types.ts`.

**Context.** Real frames carry transient conditions — a person blocking one machine's
indicator, evening light, a motion-sensing lamp cutting the room dark. These are properties
of the *observation at a moment*, not of a machine. A binary `free`/`occupied` label forces
the agent (and the labeller) to guess when the evidence isn't there, and a wrong `free` is
exactly the failure the product exists to prevent.

**Decision.**

- **State space:** `free` | `occupied` | `unknown` (+ `out_of_order`, see the amendment
  below) per machine per frame. `unknown` = not determinable from this evidence. The portal
  renders `unknown` as "unknown — check on arrival".
- **Conditions are per-observation, not per-machine.** Label schema (full form in
  `docs/PROBLEM.md`, types in `src/eval/types.ts`): a frame object with `frameConditions`
  (frame-wide list) and a `machines[]` array where each entry has `state`, `gtDeterminate`,
  and optional `observationNotes` (per-machine list). Keys are `camelCase`. Vocabularies are
  extensible.
- **Scoring:**
  - Primary = accuracy over observations with `gtDeterminate: true`; an agent `unknown`
    there is incorrect.
  - Secondary = **harmful-error rate** (predicted `free` on a determinate non-`free` truth),
    ÷ determinate observations; abstaining is not harmful.
  - Secondary = **coverage** and accuracy-on-covered.
  - `gtDeterminate: false` observations are excluded from primary accuracy, counted
    separately.
- **Baseline** uses the same enum and the same scoring.

**Consequences.** The measurable agentic win is reframed: not just higher accuracy, but
**fewer harmful errors at comparable coverage** — verification and memory earn their place
by converting confident-but-wrong into an honest `unknown`. Reporting must always show
accuracy + harmful-error + coverage together so a high-abstention method can't look good on
accuracy-on-covered alone.

**Amendment (2026-08-28) — `out_of_order`.** A machine can be visibly broken, taped off, or
showing a hard error (`E rot`, `Err`) — a user cannot use it, but it is not "occupied". Added
`out_of_order` as a fourth, **determinate** state (not an abstention). Scoring impact:
harmful error is now "predicted `free` while the truth is `occupied` **or `out_of_order`**";
calling a working machine `out_of_order` is incorrect but not harmful. `coverage` = any
actionable answer (not `unknown`). Implemented in `src/eval/{types,score}.ts` with tests;
prompts in `src/agent/{baseline,pipeline}.ts` list all four states.

**Amendment (2026-08-28) — `note` field + labelling vocabulary.** `MachineLabel` gains an
optional free-text `note` (labeller comments / judgement calls — provenance only, not
scored), distinct from the controlled `observationNotes` tag list. When the dataset author
supplies states in their own words, `scripts/gen-initial-labels.ts` maps them:
`busy`→`occupied`, `error`→`out_of_order`, `off`→`out_of_order` (the author's usage),
`unknown`→`unknown` with `gtDeterminate: false`.

---

## D-0007 — Reservations are advisory; camera is the source of truth

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** A 5-minute reservation cannot be enforced on hardware. Not every tenant uses
the app, and a tenant already in the room may take a reserved machine (e.g. they need a
second machine and one is short). The reserving user then arrives to find their machine
gone.

**Decision.**

- The reservation record is a **hint**, never a lock. The **camera-derived state is
  authoritative**; where they disagree, observed reality wins.
- The runtime agent reconciles reservations vs. observation on every state refresh. A
  reserved machine taken by a walk-in is marked **pre-empted**: the portal shows `occupied`
  at once, with a "reservation pre-empted — machine X free" note **as portal state on the
  existing read page** (not push/SMS/email — a real outbound channel would be its own
  consequential action with a sandbox + approval note).
- Guard rails: one active reservation per user; cannot reserve all machines; 5-minute expiry.
- The write-up states plainly that a given reservation can be lost; the benefit is a lower
  average wasted-trip rate, not a per-trip guarantee. In-room signage / a display is the
  production mitigation — out of scope here.

**Consequences.** Reservation handling stays P2. If it is built, the relevant metric is
**reservation-honoured rate**, measurable only in a simulation with a configurable fraction
of non-app tenants — reported separately from the P0 accuracy metric, never mixed with it.
This reconciliation is one of the concrete "conflict handling" jobs that justify an agent
over a single classifier call.

---

## D-0008 — Deployment configuration is a typed, validated TS module

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** Integrating the system into a real site needs a small set of operational knobs
(reservation hold time, per-user reservation limit, machine count, refresh interval, vision
model, cost caps, cycle-length fallbacks, paths). These must be easy for a non-author to
find, understand, and change — separate from the calibration site-config, which is
machine-generated.

**Decision.**

- Single root file **`laundry3.config.ts`**, same convention as `next.config.ts` /
  `postcss.config.mjs`. It exports overrides only; `src/config/defaults.ts` holds every
  default; the two are deep-merged and **validated on load** (`src/config/load.ts` —
  range/type/enum checks, IANA-zone check, `staleAfterSeconds ≥ stateRefreshSeconds`).
- Every field is documented inline in `src/config/types.ts` and tabulated in
  `docs/CONFIGURATION.md` (name, type, default, meaning).
- Consumers import the resolved singleton: `import { config } from "@/config"`.
- Private per-site overrides go in git-ignored `laundry3.config.local.ts`.
- `defineConfig()` gives the root file full type-checking without importing the loader
  (keeps it cycle-free).
- No new runtime dependency for validation (hand-rolled). `tsx` added as a dev dependency to
  run `.ts` tests (`node --test` via `tsx`) and, later, the `.ts` eval scripts with the
  `@/*` path alias. `src/config/load.test.ts` covers the loader/validator.

**Consequences.** Framework-agnostic — the same config loads in Next.js and in the Node eval
scripts. If the schema grows, revisit adopting `zod` for the validator. The machine roster
still comes from the calibration config; `site.machines.{washers,dryers}` is only a declared
sanity-check split by type. P2 features default off (`reservation.enabled: false`,
`agent.changeDetection.enabled: false`) — the other values in those groups are the intended
production settings.

---

## D-0009 — Dataset pipeline and eval/agent code layout

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** Real originals (phone photos + short videos) are large and carry EXIF/GPS/device
metadata. The repo must ship a reproducible eval dataset without leaking any of that, and the
code needs a place for the scoring harness, the baseline, and the agent pipeline.

**Decision.**

- **Dataset pipeline.** Originals live in git-ignored `data/raw/`. `scripts/prepare-dataset.ts`
  (ffmpeg) produces `data/public/frames/`: stills downscaled ≤1600px, video frames at a
  configurable `--fps` ≤1280px, every output run through `-map_metadata -1` **and** a JPEG
  marker stripper that drops every APPn segment (EXIF/XMP/IPTC/ICC/Adobe) and the COM
  comment ffmpeg writes, keeping a plain JFIF APP0 if present. The privacy gate
  (`scripts/check-data-privacy.mjs`) now also rejects any video staged under `data/`.
- **The produced frames are held out of git** (`/data/public/frames/` is git-ignored) until
  identifying details are removed and publish authorization is confirmed. Only the pipeline
  + scaffolding ship for now — a real-photo publish stays behind an explicit human check.
- **Splits.** `data/splits/{calibration,evaluation,smoke}.txt` — plain frame-id lists.
  `calibration` and `evaluation` must be **disjoint** (never score on a calibration frame).
  `smoke` is a small **subset of `evaluation`** — a few frames to run `--live` cheaply as a
  sanity/cache check; it is not a separate scored set and must not be used to tune prompts
  or calibration. Labels: one `data/labels/<frameId>.json` per frame, shape-checked on load.
- **Code layout.**
  - `src/eval/` — `types.ts` (label schema), `dataset.ts` (loaders), `score.ts` (metrics:
    accuracy over determinate GT, harmful-error rate, coverage, confusion).
  - `src/agent/` — `types.ts` (`VisionClient`, `SiteConfig`), `vision.ts`
    (`CachedVisionClient` with `--replay` = cache-only, `FakeVisionClient` for offline),
    `parse.ts` (tolerant JSON extraction), `baseline.ts` (one whole-frame call),
    `pipeline.ts` (calibrate → classify → verify → abstain; classify/verify stubbed).
  - `scripts/run-eval.ts` — `npm run eval -- --mode --split [--replay]`, writes a JSON
    report to `docs/artifacts/`.
- **Vision cache** (`data/cache/`) is git-ignored while the pipeline is a skeleton; the
  curated replay cache for the evaluation split is force-added once real runs exist.
- Scripts and tests run via `tsx` with the `@/*` alias; `node:test` for unit tests.

**Consequences.** The harness is testable now (20 unit tests) and runs end-to-end with the
Fake client. The real `AnthropicVisionClient` and actual labels are the remaining gap before
a first baseline number. Keeping the vision layer behind an interface is what makes
`--replay` (key-free reproduction) and offline tests possible.

**Amendment (2026-08-28) — redaction step + raised publish bar.** Added a redaction stage to
`prepare-dataset.ts`: `data/raw/redactions.json` (git-ignored; schema
`data/redactions.example.json`) lists per-source rectangles applied via ffmpeg — `boxblur`
(default strength 30) for fine print (vendor phone/email, QR, notices), solid `drawbox`
`fill` for windows; `--blur-all=N` is a coarse fallback. Applied after downscale, before the
metadata strip. Design bias: redact anything location-identifying, keep machine faces sharp
so the classification task stays realistic. **The frames were of a laundry room the author
does not own**, so the publish bar was raised from "identifying details removed" to
"**every frame verified clear one-by-one, and publish authorization confirmed**".

**Amendment (2026-08-28) — author-drawn redactions; 9 eval stills committed.** The
by-eye rectangle-tuning loop was replaced with an author-authored one: the frame author
paints solid black boxes over identifying content on pristine copies kept in
`data/raw/_reference/` (local), and `scripts/derive-redactions.ts` recovers those boxes by
connected-component analysis and writes `redactions.json` in produced-frame pixel space as
`mode: "fill"`. `prepare-dataset.ts` burns the same boxes (solid gray) into the cleaned
frames. Each of the 9 labelled P0 evaluation stills was then checked box-by-box against its
reference and its label file — every determinate machine's status display stays legible — and
the 9 are now committed under `data/public/frames/` (`.gitignore` allows them by name).
Video-derived and unlabelled frames stay local.

**Publish basis (resolved 2026-08-28).** The first amendment's plan listed "written
authorization from whoever manages the laundry room" as a handling step. **That was not
obtained and will not be pursued.** The author's basis for publishing these 9 frames instead:

- The room is a **shared common area open to every resident of the building** — not a private
  or access-controlled space.
- **No personal privacy is implicated:** shot with no people present, no third-party
  belongings in frame, tightly on the appliance faces.
- **Redaction removes the location-identifying content** — vendor service sticker and phone,
  window and TV views — verified box-by-box; generic décor is left as-is.
- The dataset is 9 heavily-redacted stills of coin-op machines, used only to score a status-
  reading agent.

This is the author's own risk assessment, recorded here for the record. It is *not* a legal
opinion. If a reviewer or the room's management objects, the frames come out of git and the
eval falls back to `--replay` from the committed cache (which needs no frames).

**Measurement gap — closed (2026-08-28).** The cache was refreshed: the archived
`claude-sonnet-5` run (on the earlier lightly-blurred frames) was replaced by a `--live`
`claude-haiku-4-5` run against the committed author-redacted frames, so cache, reports, and
frames now all agree. New numbers: baseline 62.2% acc / 2.2% harmful; verify pass 57.8% acc
/ 0.0% harmful — **net-negative on accuracy**, see `docs/CHANGELOG.md`. The sonnet run stays
in git history at `e8de845` for contrast only (not point-comparable — model and frames both
differ).

**Integrator note.** For a real deployment the redaction geometry is better stored as one
raster mask per camera angle (a PNG painted once per fixed camera and reused for every
frame from it) than as per-frame rectangles — see `data/README.md`.

---

## D-0010 — Labelling workflow and secrets handling

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** Ground truth must be producible by an integrator, not just the author, and the
Anthropic key must stay out of the repo and out of any transcript.

**Decision.**

- **Roster.** `data/machines.json` is the canonical machine list (`W-01…`, `D-01…`, stable
  ids matching printed numbers where present). Edited once per site.
- **Flow** (full guide: `docs/LABELING.md`): `npm run label:new -- <frameId>` scaffolds
  `data/labels/<frameId>.json` from the roster (all machines, `state: "unknown"`); the
  labeller sets each `state` / `bbox` / notes from the image and **deletes** machines not
  visible in that frame. `npm run label:check -- --split=<name>` validates (ids in roster,
  no dups, splits disjoint, images exist); `npm run label:stats` shows coverage + state
  distribution. Model-drafted labels are allowed as an accelerator but a human confirms
  every machine — the label file is the authority.
- **Secrets.** `.env.example` is committed with `ANTHROPIC_API_KEY=` (blank) and an optional
  `LAUNDRY3_VISION_MODEL`. `.env` is git-ignored (`!.env.example` un-ignores the template).
  `scripts/load-env.ts` calls `process.loadEnvFile(".env")` (Node built-in) before anything
  reads `process.env`; a missing file is fine because `--replay` needs no key. Keys are
  never pasted into chat, commits, or docs.

**Consequences.** A second person can build the dataset and reproduce a run from a clean
checkout with only their own key. `label:check` is the gate that keeps splits disjoint and
labels well-formed before a scored eval.

---

## D-0011 — Real vision client (Anthropic SDK)

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The eval harness needs to actually call Claude vision; the skeleton used a
stub. Built per the `claude-api` skill.

**Decision.**

- `@anthropic-ai/sdk` dependency; `AnthropicVisionClient` implements the same `VisionClient`
  interface as the Fake/Cached clients, so `--replay` and the offline tests keep working.
- One `client.messages.create` per frame: base64 JPEG + prompt, `max_tokens: 1500`
  (responses are ~300–700 tokens; lowered from 4000). No streaming, no explicit `thinking`.
  `output_config.effort` is sent only when `agent.visionEffort` ≠ `"none"` — `claude-haiku-4-5`
  **rejects** the parameter (400), so the default `"none"` omits it; sonnet/opus accept
  `"low"`/`"medium"`/`"high"`.
- **Model** = `laundry3.config.ts` `agent.visionModel`, overridable per run with
  `LAUNDRY3_VISION_MODEL`. **Default is `claude-haiku-4-5`** ($1/$5 per MTok) for cost, and
  the recorded baseline + Iteration 1 runs use it. `VisionResponse.model` is persisted in
  the cache so `--replay` reports the model that produced each run. An earlier
  `claude-sonnet-5` run (different, pre-redaction frames) is archived at commit `e8de845`.
- **Cost attribution:** `VisionResponse` carries `model` / `inputTokens` / `outputTokens` /
  `costUsd` from a per-model `PRICE_PER_MTOK` table (rates dated in the source);
  `run-eval.ts` writes a `totals` block + the model(s) in the report and prints the aggregate.
- `run-eval.ts` requires **exactly one** backend flag so a bare `npm run eval` can't bill:
  `--live` (paid API call, writes the cache), `--replay` (cache only, no key), `--fake`
  (offline stub, **no cache** — cannot poison the replay cache).
- `req.crop` (ROI) is not applied in the client yet — the caller will pass a pre-cropped
  path when the pipeline's classify step is built.

**Consequences.** A first real `npm run eval -- --mode=baseline --split=evaluation --live`
needs `ANTHROPIC_API_KEY` in `.env` and a labelled split; it writes `data/cache/baseline/`
which is force-added as the key-free reproduction artifact. Price table must be kept current.

---

## D-0012 — Baseline and agent are told which machine ids are in the frame

- **Date:** 2026-08-28
- **Status:** Accepted

**Context.** The metric is per-machine accuracy keyed by `machineId`. On the first `--live`
run the model returned its own positional labels ("center-washer") — nothing matched the
`W-01…`/`D-01…` roster, so every observation scored as a missing prediction (0%).

**Decision.**

- Both the baseline (`baselinePrompt`) and the agent (`classifyPrompt`) are given, per
  frame: the **list of machine ids present** and the **global numbering convention**
  (W-/D-, left-to-right along each bank, stacked upper = lower number). The model maps ids
  to machines and returns one entry per id.
- This is applied **symmetrically** — the A/B comparison stays fair. It tells the model
  *which* machines to report on, not their states.
- The id list is derived from the ground-truth label
  (`label.machines.map(m => m.machineId)` in `run-eval.ts`), so both sides also get
  GT-derived frame membership (which machines are in view + their type). Symmetric, but an
  unrealistic assist vs. a real deployment — listed as a limitation in `docs/EVALUATION.md`.

**Consequences.** The baseline is no longer "the model with zero context" — it knows the
roster and machine count for the frame. The agentic contribution to measure is therefore
ROI cropping, verification, and memory — not machine discovery. If a later iteration adds a
detection step, that becomes its own experiment with the id list withheld.

---

## D-0013 — Agent pipeline: verification pass + abstain floor

- **Date:** 2026-08-28
- **Status:** Iteration 1 — kept in-tree, config-gated, as a **studied negative result**
  (net-negative on accuracy on `claude-haiku-4-5`; see `docs/CHANGELOG.md`). Not the shipped
  answer — Iteration 2 (integrator corrections) is.

**Context.** The baseline (one whole-frame call) answers `unknown` on ~40% of machines and
never recognises `out_of_order`. The agentic layer has to do better without just guessing.

**Decision.** `runAgent` (`src/agent/pipeline.ts`):

1. **Classify** every machine from the whole frame (baseline-equivalent prompt).
2. **Verification pass** — for machines returned `unknown` or below
   `config.agent.verification.confidenceThreshold` (0.7), one *second* focused vision call
   that names those machines and lists explicit `out_of_order` / `occupied` / `free` cues
   (incl. "dim/dead 7-segment segments — read the shape, don't over-read"). Its answers
   override pass 1 for those ids. Capped by `config.agent.maxVisionCallsPerFrame`.
3. **Abstain floor** — the model's own `unknown` is the abstention signal; a separate
   confidence gate only overrides an *answered* machine whose confidence is below
   **half** the verification threshold (0.35), i.e. a near-guess.

**Consequences (on `claude-haiku-4-5`, the deploy model).** The verification pass is
**net-negative on accuracy** (62.2% → 57.8%): asked to re-examine a low-confidence machine,
haiku picks the more eventful label, flipping 4 correctly-`free` machines to `occupied`. It
does clear the one harmful error (2.2% → 0%) and both `unknown`s (coverage 95.6% → 100%), and
it still never reaches `out_of_order` (0/8). On `claude-sonnet-5` (archived, earlier frames)
the same prompt cut harmful error and caught 2/8 `out_of_order` — the regression is
model-specific. **Kept config-gated** (`agent.verification.enabled`) so the result is
reproducible, but the pipeline's real improvement path is D-0014 **integrator corrections**
(Iteration 2), which is what moves `out_of_order`. **Removed dead-end:** abstaining at the
full 0.7 threshold collapsed coverage to ~4% (dev observation, not archived).

---

## D-0014 — Integrator corrections (human-in-the-loop, Iteration 2)

- **Date:** 2026-08-28
- **Status:** Accepted (Iteration 2; see `docs/CHANGELOG.md`)

**Context.** The vision model — on the deploy model `claude-haiku-4-5` — cannot tell a broken
machine from a running one: a hard-error code on the display reads as an active cycle, so
`out_of_order` recall is 0/8 for both baseline and the verification pass, and that is 8 of
the 19 remaining errors. Prompt tweaks did not fix it. The problem statement always assumed a
human onboarding phase (`docs/PROBLEM.md`, scoping Q11–12): a service company installs the
system and spends time confirming its output. That human is the missing signal.

**Decision.** A stored, replayable **correction store** the integrator writes to.

- `src/eval/corrections.ts` — `Correction { machineId, correctState, scope, note?, by, at }`.
  - `scope: "observation"` — fixes one `(frameId, machineId)`. For `free` / `occupied`,
    which change over time.
  - `scope: "machine"` — a **durable** property of the physical unit (`out_of_order`, a
    removed machine). Applies to that `machineId` in **every** frame until revoked. One
    entry fixes a broken machine the model keeps misreading, in every angle and every later
    capture.
- Storage: `data/corrections/<frameId>.json`, committed (small, human-authored ground
  truth). `loadCorrections()` flattens all files; `machine`-scope entries are promoted to
  all frames; an `observation`-scope entry wins over a `machine`-scope one for its frame.
- `applyCorrections(prediction, corrections)` overlays them as an **authoritative override**
  (state replaced, `confidence` → 1, rationale marked integrator-sourced). Non-mutating.
- CLI `npm run correct -- <frameId> <machineId> <state> [--scope=machine] [--note=…]`
  (`--list` to review). Eval: `npm run eval -- --mode=agent --split=… --corrections` applies
  the store before scoring and writes `eval-<mode>-corrected-<date>.json` with a
  `corrections` count.

**Consequences.** **3 `machine`-scope corrections** — `W-04`, `D-02`, `D-06`, each "this unit
is out of service" — applied across the 9 frames (10 cells, 8 of them determinate) take the
agent from **57.8% → 75.6%** accuracy and **`out_of_order` recall 0/8 → 8/8**, at **no extra
model cost** (corrections are applied post-hoc). Harmful-error stays 0.0%, coverage 100%.
The remaining 11 errors are all `free`→`occupied` over-calls, which are `observation`-scope
and time-varying — correcting those is per-frame hand-labelling, not durable learning, so
they are left as the honest ceiling of this mechanism. **This is the shipped improvement
path**, not the verification pass (D-0013). Portal write-UI for corrections: D-0015.

---

## D-0015 — Integrator calibration model: cameras, masks, per-machine reference states + prompt

- **Date:** 2026-08-28
- **Status:** Proposed — spec only; portal + `site-config.json` schema not built. Recorded
  now so the build and the config format agree and to avoid rework.

**Context.** D-0009 / D-0010 name a `data/site-config.json` produced during onboarding
(per-machine ROIs, reference crops, few-shot exemplars, thresholds). D-0014 adds a correction
store. This decision fixes **what an integrator supplies** through the portal and **how the
agent consumes it**. Architectural note from the project owner, 2026-08-28.

**Decision.** Two integrator-managed objects: **cameras** and **machines**.

### Camera
- `id` + a **free-text list of machine ids** this camera observes (e.g. `"W-01, W-02, W-03"`).
  The text mapping tells the agent which machines to report from this feed. In a real
  deployment this **replaces** the GT-derived "which machines are in frame" assist (D-0012):
  integrator-supplied, not label-derived.
- Optionally **also** an **annotated reference screenshot** from this camera — a still with
  the machine ids marked on it (shapes / labels drawn over each machine, like the
  `data/raw/_reference/*.jpg` images). Handed to the agent as a one-off spatial key so it
  knows *which region is which machine*, not just the roster. The text list and the annotated
  screenshot are complementary, not either/or: the list is the roster, the screenshot is the
  spatial grounding. Both optional beyond the list; with the screenshot, per-machine
  attribution in crowded frames improves.
- Optional **mask image** (PNG). Semantics: **transparent = analyse**, **solid black
  `rgb(0,0,0)` = exclude from analysis**. Applied to every frame from this camera before the
  agent sees it (same mechanism as the dataset redaction mask, D-0009 — privacy redaction
  and analysis-scoping converge on one tool). A mask may black out the whole frame **except**
  one machine's indicator area, scoping a camera to a single machine.
- Capture cadence stays global (`runtime.captureIntervalSeconds`), not per-camera, for now.

### Machine
- `id`, `type` — as today (`data/machines.json`).
- Optional **reference-state screenshots**: one or more images per state (`free` / `occupied`
  / `out_of_order` / …), **not necessarily from the camera** — e.g. a close-up of this
  machine's indicator panel in each state. Given to the agent as visual few-shot context
  when it assesses this machine.
- Optional **per-machine prompt fragment**: free text describing this machine's states / how
  to read its indicator (e.g. "left digits = cycle-minutes countdown; a solid `E` with no
  digits = out of order; all segments dark = powered off"). Appended to the agent's prompt
  for this machine.
- Both are **optional**. With neither, the agent relies on its own judgement and the camera
  view (current behaviour). With them, per-machine accuracy rises **without fine-tuning**.

### Agent consumption order
1. Apply the camera mask (pre-inference).
2. Classify the machine ids the camera declares; if the camera has an annotated reference
   screenshot, pass it alongside the live frame as the spatial key. Inject each machine's
   reference-state screenshots (few-shot image blocks) and prompt fragment into the
   classify/verify prompt.
3. Optional verification pass (D-0013, default off — documented regression).
4. Overlay D-0014 corrections as the final authoritative override.

### Portal (write-UI — "full slice", per the owner)
- `?role=integrator` reveals the editing surface; the default (tenant) view shows only
  agent-determined state.
- CRUD cameras (id, machine-id text list, optional annotated reference screenshot, mask
  upload) and machines (id, type, reference-state screenshots, prompt fragment); per-machine
  "mark wrong" → writes a D-0014 correction.
- Persists to `data/site-config.json` + `data/machines.json` + `data/raw/masks/` +
  `data/corrections/` via Node API routes (server/dev runtime only — the static export has
  no writable FS).

**Consequences.** Gives the integrator, per camera, a machine-id list (mandatory) plus an
optional annotated screenshot for spatial grounding and an optional mask; and per machine,
optional reference-state screenshots and an optional prompt fragment — all non-fine-tuning
levers. The site-config schema and the portal must be built to this shape; `buildRoomStatus`
must also apply corrections so the portal reflects the corrected state.

---

## D-0016 — Deployment: Docker service, `FrameSource` abstraction, static-image mock

- **Date:** 2026-08-28
- **Status:** Proposed — spec + phasing. P0 (judge-walkable integrator path) is the
  minimal-submission target; the container and real camera sources are later phases.

**Context.** Vercel is out for the integrator side: its filesystem is read-only, and the
runtime is a polling loop that does not fit a serverless invocation (D-0015 discussion, and
the deployment notes below). The original scoping always described an on-site "hardware
solution" a service company installs (`docs/PROBLEM.md`, scoping Q5 / Q16). Owner's call
(2026-08-28): ship as a **Docker container run as a local service**.

**Decision.**

### Packaging
- One Docker image: Next.js app (tenant read + integrator write), the runtime loop, `ffmpeg`,
  Node. `ANTHROPIC_API_KEY` via env / Docker secret.
- Writable **volume** for all mutable state — this is what read-only Vercel could not do:
  ```
  /data
    site-config.json        cameras, machines, mask refs, prompt fragments
    machines.json
    corrections/*.json       D-0014
    masks/<camera>.png       D-0015
    reference/<machine>/*.jpg reference-state screenshots
    snapshot.json            latest published per-machine status (portal reads this)
  ```
  Survives container restarts. `docker compose up` for the judge.

### `FrameSource` abstraction
An interface with one method — "give me the current frame for camera X" — and implementations:

| Impl | How |
| --- | --- |
| `HttpSnapshotFrameSource` | network camera: GET a JPEG snapshot every `runtime.captureIntervalSeconds` |
| `RtspFrameSource` | RTSP stream → one frame via `ffmpeg` |
| `UsbFrameSource` | `--device=/dev/video0`, `ffmpeg -f v4l2` |
| **`StaticImageFrameSource`** | the integrator selects/uploads a still per camera through the portal; "capture" = re-read that file |

`StaticImageFrameSource` is **not throwaway** — it is also the dev/test fixture and the
"replay a recorded incident" tool. Swapping the image simulates a state change in a demo.

### Runtime loop
A long-running process (not a serverless function): every `captureIntervalSeconds`, for each
camera — pull a frame via its `FrameSource`, apply the camera mask (D-0015), call the vision
client (cached), classify the camera's declared machine ids with reference screenshots +
prompt fragment injected; every `stateRefreshSeconds`, fuse across cameras, overlay D-0014
corrections, write `snapshot.json`. The portal reads `snapshot.json` (replaces the
committed-eval-report read in `buildRoomStatus`).

### Phasing
- **P0 — minimal submission (must ship).** No container required to *evaluate* it. The judge
  can walk the **entire integrator path key-free**, operating on the 9 committed frames with
  `--replay`: pick `img_1821` as "camera 1's feed" → see the agent's cached per-machine
  states → mark `D-02` wrong → `out_of_order` (writes a D-0014 correction via `/api/corrections`,
  which works under `npm run dev` / any Node host) → re-fuse → the portal shows it fixed. The
  `--corrections` eval run already proves the measurable effect (D-0014). Camera / mask /
  reference-screenshot / prompt-fragment editing may be a config file the judge edits by hand
  if the UI is not finished, but the **correction loop must be clickable**.
- **P1** — `Dockerfile` + `docker compose`, the runtime loop, `StaticImageFrameSource`, the
  snapshot publisher. Judge runs `docker compose up` and does the same walk against static
  images instead of the frozen dataset.
- **P2** — `HttpSnapshotFrameSource` / `RtspFrameSource` / `UsbFrameSource` for real cameras.

**Acceptance criterion (all phases):** a judge with no hardware and no API key can complete
the integrator path — add/adjust a camera's machine list, (P1+) point it at an image, run the
agent, see a wrong state, correct it, and see the correction take effect in the portal and in
a re-scored eval.

**Consequences.** The read-only tenant portal can still also go on Vercel for a public demo
link (D-0015 discussion), built from `snapshot.json` or the committed report. The container
is the real product; Vercel is a convenience mirror of its read side.
