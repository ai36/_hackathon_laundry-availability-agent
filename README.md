# laundry3

A project for the **micro1 Agentic Workflows Hackathon**. Submission deadline:
2026-08-31 11:00 America/Los_Angeles (Portland time, PDT / UTC-7).

## The intended user & the bottleneck

A tenant in an apartment complex with a **shared laundry room** (here: 16 washers + 16
dryers). Today, to do laundry they gather a full bag, carry it down to the laundry room,
and often find **every machine occupied** — then carry the bag back, wait an unknown
amount of time, and try again, hauling the laundry on every attempt. There is no way to
check availability before the trip, and no way to hold a machine for the few minutes it
takes to walk over.

**laundry3** reads frames from the laundry-room cameras with an agent and publishes a
per-machine **free / occupied / out-of-order / unknown** list, so the tenant checks first
and only walks over when a machine is actually available. Why it matters: it removes wasted
trips and the physical effort of carrying laundry back and forth; for the building it means
better-used machines and fewer complaints.

Full problem statement, scope, phasing, and the data/privacy plan: **`docs/PROBLEM.md`**.

## What's built (hackathon scope)

The core P0: given a laundry-room frame, produce a **verified per-machine status list**.

- **Baseline** — one whole-frame vision call, told which machine ids the camera covers.
- **Calibrated agent** — the same call plus the camera's annotated shot + mask as extra
  vision inputs (D-0015). **Dead-end** — see below.
- **ROI agent** — crop the frame to each machine's own colour region in an integrator-painted
  region map, one call per machine (`src/agent/roi.ts`). Architecturally right; on its own a
  small shortfall vs baseline — see below.
- **Integrator corrections (D-0014)** — an integrator records a machine's true state once;
  a `machine`-scope correction overrides the agent for that unit in every frame and every
  future capture.
- **Correction → `promptFragment` feedback loop (D-0014, Iteration 3)** — `npm run synthesize`
  turns each correction + the model's own wrong rationale into a per-machine **reading rule**;
  the ROI agent consumes it (`--mode=roi --fragments`). **The first automated config that
  beats the baseline** — see below.

### Results — `claude-haiku-4-5`, 5 committed frames (one per calibrated camera), 22 determinate observations

| Metric | Baseline | Calibrated (images) | ROI | **ROI + fragments** | **Baseline + corr.** | ROI + frag. + corr. |
| --- | --- | --- | --- | --- | --- | --- |
| Per-machine accuracy | 45.5% | 31.8% | 40.9% | **63.6%** | **68.2%** | **72.7%** |
| **Harmful-error rate** (told `free`, actually not) | 9.1% | 0.0% | 9.1% | 4.5%¹ | 4.5% | **4.5%** |
| Coverage (gave an actionable answer) | 100% | 100% | 86% | 82% | 100% | 86% |
| **`out_of_order` recall** | 0/5 | 0/5 | 0/5 | 3/5 | **5/5** | 5/5 |
| Model cost per frame | ~$0.003 | ~$0.007 | ~$0.004 | ~$0.005 | ~$0.003 | ~$0.005 |

¹ noisy — 3 samples of the frozen fragments: harmful 4.5 / 18.2 / 4.5 %, accuracy 63.6 /
59.1 / 63.6 %, `out_of_order` 3/5 all three (`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`).

**The feedback loop is the improvement: `ROI + fragments` 63.6 % — +18.2 pp over baseline,
+22.7 over plain ROI, the first automated configuration above the baseline.** `npm run
synthesize` reads each of the 3 integrator corrections plus the model's own wrong rationale
and writes a per-machine reading-rule into `data/machines.json` (e.g. for `D-02`: *"a solid
error display is not an active cycle; cycles show an animated countdown with a blinking
colon"*); `--mode=roi --fragments` appends it to that machine's call. Of the 5 cells it fixes
over plain ROI (0 broken), **4 are held-out spatially** — a rule derived from one frame helps
a *different* frame (2 cells, same machine) or an *un-corrected neighbour* sharing the crop
prompt (2 cells). `out_of_order` recall 0/5 → 3/5. Combined with the override: 72.7 %.

**Read it honestly:** all 5 frames are one capture session, so "held-out" here is spatial,
not temporal — the real test is a re-shoot at a different time, still the remaining step.
n = 22, one committed sample (2 author-attested re-runs, not reproducible); harmful-error is
noisy (one re-run 18.2 %); all 3 corrections are `out_of_order`, so the rules are
broken-machine cues, not a `free`↔`occupied` reading-rule test; one of the 5 fixes is
in-sample (circular) — excluding it, 13/22 = 59.1 %, still +13.6 pp over baseline from
held-out cells. The override (`Baseline + corr.`) scores higher *on the corrected cells* (it
is ground truth there) but does not generalise. The override (`Baseline + corr.`)
scores higher *on the corrected cells* (it is ground truth there) but does not generalise.

**The dead-end and the shortfall it grew out of:**

- **Calibrated (feeding the annotated shot + mask as extra vision inputs) is a dead-end**
  (−13.7 pp): the model reads state off the flat-colour annotation, and the mostly-black
  mask image collapses it onto "occupied" for every machine (`free` recall 0/10). Tried on
  two models and four prompt phrasings; none beat baseline.
- **ROI on its own** is the right architecture — no positional inference, robust to camera
  angle and stacked units — but the frozen config scores **40.9 %, a ~4.6 pp shortfall below
  the baseline** (stable across 3 samples; `docs/artifacts/eval-roi-samples-2026-08-29.md`):
  `claude-haiku-4-5` can't reliably read small / worn 7-segment displays in the wide, angled
  shots (C-02: 1/7). ROI is kept because it is the surface the feedback loop plugs into —
  per-machine crops are what a per-machine rule attaches to. Adding the synthesised rules
  (`--fragments`) is what takes it to 63.6 %.

All kept in-tree (`--mode=calibrated` / `--mode=roi` [`--fragments`], caches committed) so
every result reproduces. Full write-up: `docs/CHANGELOG.md`.

**The override on its own: 45.5% → 68.2% (+22.7 pp).** Three durable facts — "`W-04` /
`D-02` / `D-06` are out of service" — recorded once, applied across the five observations of
those units (cameras C-01–C-04), taking `out_of_order` to 5/5 at no model cost and halving
harmful-error. This is the guaranteed fix and the training signal the loop above consumes; on
its own it is a patch, not learning.

**Read the delta honestly:** a correction is human ground truth applied as an override, so it
scores 100% on its own cell by construction — "+22.7 pp" means "an integrator overrode 5 of
22 cells to their known-correct value." On the **17 observations no correction touches**, the
model scores **10/17 = 58.8%** — that is the model-capability number; 68.2% is that plus the
5 overrides. What the delta legitimately shows: the `out_of_order` failure is real and fixed
by none of prompting, image calibration, or per-machine cropping — and the feedback loop is
what turns that override into a rule the model applies itself. **n = 22** per config; re-runs
of the frozen fragments hold accuracy at 59–64 % but move harmful-error 4.5–18.2 %
(`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`). All runs `--replay`-reproducible
offline. Full write-up: **`docs/CHANGELOG.md`**.

### The portal

`npm run dev` → URL-routed pages that fuse the agent's per-machine assessments across every
camera angle and **overlay the integrator corrections** (`src/portal/room-status.ts` +
`src/stores/machines-store.ts`, MobX):

- **`/tenant`** — the tenant room view: current state per machine, plus per-kind
  free counts. Tapping a free machine opens a confirm dialog to **reserve** it (a short
  auto-expiring hold). A held machine reads **In use** for everyone; the owner's view adds a
  "your reservation" badge. No cancel — a hold only lapses; you can hold up to
  `reservation.maxActivePerUser` machines at once (default 2), enforced on both the client
  and the server. Server-rendered per request. `/` redirects here.
- **`/integrator`** — the integrator console: per-card agent confidence + source frame + a
  **“✕ mark wrong”** control and a **“↻ refresh recognition”** button.
- **`/integrator/settings`** — Machines + Cameras CRUD + a site overview.

`/integrator*` are server-rendered per request so they reflect live `data/corrections/` +
`data/machines.json`. `buildRoomStatus` reads the raw baseline predictions
(`docs/artifacts/eval-baseline-2026-08-29.json`, 45.5%) and overlays the 3 committed
`machine`-scope corrections from `data/corrections/` on every request — the **"baseline +
corrections"** result (68.2%, `docs/artifacts/eval-baseline-corrected-2026-08-29.json`).
All three routes are built from one small in-repo UI kit (`src/components/ui/`, on `radix-ui`
+ `lucide-react`) in the owner-supplied **"Lumina Wash"** design system (single dark theme,
`Inter`, px type scale — `docs/design-reference/`); responsive with no mobile horizontal
scroll, and a left-rail / bottom-bar nav shell. The
**“↻ refresh recognition”** control on `/integrator` has a manual button **and an auto
toggle** — every cycle `POST /api/refresh` captures each camera's feed and (with a key) runs
the agent, then re-fuses. Tenant **reservations** are wired (`POST /api/reservations`,
git-ignored `data/reservations.json`) and on by default (`reservation.enabled`); the
integrator can toggle them in Settings → Configuration. Pre-emption reconciliation (a
walk-in taking a held machine) stays P2. A live camera feed is P2, not wired.

![laundry3 portal — tenant view (/tenant): per-kind free counts, per-machine state, tap a free machine to reserve](docs/assets/portal-top.jpg)
![laundry3 portal — integrator console (/integrator): agent confidence, source frame, "mark wrong" on every card, manual + auto refresh](docs/assets/portal-machines.jpg)
![laundry3 portal — settings (/integrator/settings): the Machines editor — id / type / prompt-fragment per machine](docs/assets/portal-settings.jpg)

Every card is one machine from `data/machines.json` (**16 washers + 16 dryers**); the five
calibrated cameras between them cover 17 of the machines, so the rest show as `unknown` /
"not covered".

**Integrator walkthrough (no API key, no hardware).** The judge can walk the whole
correction loop on the frozen dataset:

```bash
npm run dev            # http://localhost:3000
```

1. Open `http://localhost:3000/integrator` — every card shows the agent's confidence, the
   frame it came from, and a **“✕ mark wrong”** control. **“↻ refresh recognition”** re-runs
   the fusion (the D-0016 container's re-capture + re-classify hook). **`/integrator/settings`**
   has the **Machines** editor (add / remove / rename, set type, view / edit a per-machine
   `promptFragment` — hand-written or synthesised by `npm run synthesize`; `--mode=roi
   --fragments` consumes it — writes `data/machines.json`), the
   **Cameras** editor (id + free-text machine-id list + optional stub image + region map
   upload — writes `data/site-config.json`), and a site overview.
2. Find a machine the agent got wrong (e.g. a `free` washer shown as `In use`). Click
   **mark wrong**, pick the correct state, optionally tick **“applies to this machine in
   every view (durable)”**, add a note, submit.
3. `POST /api/corrections` writes `data/corrections/<frame>.json` and returns the re-fused
   room; the card flips immediately and gets an **integrator** badge. A *durable* correction
   also carries to every other view of that machine — and, with a key set, it runs the
   **feedback loop**: the response carries `synthesized: {…}`, a per-machine reading-rule now
   in `data/machines.json`. The next **"↻ refresh recognition"** classifies that machine (and
   its stack neighbours) with the rule (`/api/refresh` folds `promptFragment`s in).
4. Re-score offline with the same stores:
   `npm run eval -- --mode=baseline --split=evaluation --replay --corrections` (override, 68.2 %)
   and `npm run synthesize -- --replay && npm run eval -- --mode=roi --split=evaluation
   --replay --fragments` (the loop, *rules but no override*, 63.6 % — see the results table).

The tenant view (`/tenant`) shows only the resulting state — no confidence, no controls. Full
deployment shape (Docker, `FrameSource`, static-image mock): `docs/DECISIONS.md`
D-0014 / D-0015 / D-0016.

### Main failure mode & hot take

**Failure mode:** the model reads the price panel, not the cycle. `claude-haiku-4-5` treats
the always-lit `2.25` price display as an active countdown, so it over-calls `free` machines
as `occupied` (6/10), and it reads a hard-error display (`E rot`) as a running cycle, so
`out_of_order` recall is 0/5. Adding the D-0015 calibration images made this **worse**: the
model reads state off the flat-colour annotation, and the mostly-black mask image pushes it
to answer `occupied` for everything.

**Hot take:** the highest-leverage work was building the metric *before* the agent, and
being willing to record a negative result — two changes that *looked* like progress (a
verification pass, image calibration) were regressions, and only separate `harmful` /
coverage / `out_of_order` scoring made that legible. And the agentic design that finally beat
the baseline was not a cleverer one-shot prompt — it was the **loop**: a human overrules one
failure, `npm run synthesize` turns it into a durable reading-rule, and the model applies the
rule itself on frames it never saw (4 of 5 gains held-out, including a rule for one machine
fixing an un-corrected neighbour). Let a correction *teach the model a rule*, not just patch
one cell.

**Honest gap:** the loop is built and **operable end-to-end in the portal** (a durable
correction synthesises a rule; `/api/refresh` classifies with it), but the portal path is not
separately measured — the **63.6 % is the offline `--replay` chain only**, and only as far as
5 frozen frames allow: n = 22, all 3 corrections are `out_of_order` (so the rules are
broken-machine cues, not a `free`↔`occupied` reading-rule test), and one of the 5 fixes is
in-sample. The real number needs a **temporal / held-out capture set** — re-shoot the same 5
angles at a different time so the rules are scored only on frames from *after* the
corrections. That is the remaining step. See `docs/DECISIONS.md` D-0014 "Status (2026-08-30)".

## How agents are used

- **The solution agent** (`src/agent/`) — a two-step vision pipeline (classify → verify),
  behind a `VisionClient` interface with a response cache so every scored run reproduces
  key-free (`--replay`). The verify step is config-gated and, on the deploy model, a
  documented regression — see the results above.
- **Integrator corrections** (`src/eval/corrections.ts`, `npm run correct`) — a human-in-the-
  loop store the agent treats as authoritative. `machine`-scope corrections encode durable
  facts (a broken unit) that carry to every frame (Iteration 2 — the guaranteed fix).
- **Correction → prompt synthesis** (`src/eval/prompt-synthesis.ts`, `npm run synthesize`;
  wired into `POST /api/corrections` + `/api/refresh`) — the feedback loop (Iteration 3): a
  model reads each correction + the classifier's own wrong rationale and writes a per-machine
  reading-rule into `data/machines.json`, which the ROI agent (`--mode=roi --fragments`) and
  the live refresh path then consume. The step that first beat the baseline automatically.
  Trajectory: `docs/trajectories/2026-08-30-feedback-loop.md`.
- **`grillme`** skill — a Socratic interview that turned the one-line brief into the scoped
  problem, metric, and dataset plan. Result: `docs/PROBLEM.md`; scope decision:
  `docs/DECISIONS.md` D-0005.
- **ROI agent** (`src/agent/roi.ts`, `--mode=roi`) — crops the frame to each machine's own
  colour region in an integrator-painted region map and classifies one machine (or one
  stacked pair) per call. On its own a ~4.6 pp shortfall; it is the surface the feedback loop
  attaches its per-machine rules to. Trajectory: `docs/trajectories/baseline/2026-08-29-roi.md`.
- **`hackathon-compliance` subagent** (`.claude/agents/`) — an independent reviewer run on
  every change against `docs/HACKATHON-RULES.md`; it caught a reproducibility blocker (the
  cache keyed on image bytes) and several overclaims. Records under
  `docs/trajectories/compliance/`.
- **`find-skills`** — on-demand skill discovery.

Details: **`docs/SKILLS.md`**, **`docs/DECISIONS.md`** (D-0003, D-0004, D-0011–D-0015).

## Tech stack

TypeScript · Node 24 · Next.js 16 (App Router) · Tailwind CSS v4 · MobX 7 · `@anthropic-ai/sdk`.
Exact versions and rationale: `docs/DECISIONS.md` (D-0001).

## Quick start

```bash
npm ci
git config core.hooksPath .githooks          # dataset-privacy pre-commit gate
npm run eval -- --mode=baseline --split=evaluation --replay                # the fair baseline — 45.5%, no API key, no cost
npm run eval -- --mode=roi      --split=evaluation --replay --fragments    # the feedback loop — 63.6% (synthesised reading-rules)
npm run eval -- --mode=baseline --split=evaluation --replay --corrections  # the override on its own — 68.2%
```

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`,
`npm test` (89), `npm run check:data`. Full clean-environment walkthrough (including a
`--live` re-run and the dataset pipeline): **`docs/REPRODUCTION.md`**.

## Configuring for a real site

Edit **`laundry3.config.ts`** — reservation hold time, per-user reservation limit, machine
roster, refresh interval, vision model, cost caps, cycle-length fallbacks, paths. Every
setting is documented in **`docs/CONFIGURATION.md`** and validated on load.

## Project layout

```
laundry3.config.ts  Deployment config (site-integration knobs)
src/config/         Typed config: defaults, loader + validator, tests
src/eval/           Label schema, dataset loaders, scoring (accuracy / harmful-error / coverage)
src/agent/          Vision client (+ cache/replay), reply parser, baseline, agent pipeline
src/portal/         room-status: fuse the eval report into a per-machine room view
src/app/, src/stores/, src/components/   Next.js portal page + MobX MachinesStore
scripts/            prepare-dataset · run-eval · label · gen-initial-labels · check-data-privacy
data/               raw/ (ignored) · public/frames/ (5 labelled eval stills + annotated + mask, redacted) · labels/ · splits/ · cache/ — see data/README.md
docs/               Hackathon deliverables (see the table below)
.claude/            Claude Code config: hackathon-compliance subagent, git-guard hook, /worklog
```

## Documentation

| File | What it holds |
| --- | --- |
| `docs/SUBMISSION.md` | **Start here** — the 4 hackathon deliverables → where each lives, and the 1-minute reproduction |
| `docs/PROBLEM.md` | Problem, user, bottleneck, scope, definition of "good", privacy plan |
| `docs/CHANGELOG.md` | **Improvement Changelog** — baseline → calibration dead-end → integrator corrections, with evidence |
| `docs/EVALUATION.md` | Metric, cases, rubric, known limitations, recorded results |
| `docs/REPRODUCTION.md` | Clean-environment setup, exact commands, expected output, runtime & cost |
| `docs/DECISIONS.md` | Decision log (D-0001 … D-0016) |
| `docs/CONFIGURATION.md` | Every deployment-config setting: type, default, meaning |
| `docs/LABELING.md` | How an integrator turns frames into ground truth |
| `docs/SKILLS.md` | Connected agent skills and when to use them |
| `docs/HACKATHON-RULES.md` | Full transcription of the hackathon rules |
| `docs/trajectories/` | Agent trajectory records — `baseline/` (baseline + calibrated dead-end + ROI), `runtime/` (retired verification pass), `compliance/` (reviewer), plus the integrator-correction loop |
| `docs/WORKLOG.md` | Chronological record of every change |
| `CLAUDE.md` | Agent working agreement for this repo |

## What existed before the hackathon

Nothing. Created 2026-08-28. `create-next-app` provided the initial Next.js scaffold; every
other change is a dated entry in `docs/WORKLOG.md`.
