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
be a Client Component wrapped in `observer`. The `ExampleStore` / `ExampleCounter` pair is
scaffolding and should be deleted once real stores exist.

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
  is `free`/`occupied`/`unknown`, not a binary, and the metric now includes harmful-error
  rate and coverage.

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
- **Status:** Accepted (supersedes the "free vs occupied" binary in D-0005)

**Context.** Real frames carry transient conditions — a person blocking one machine's
indicator, evening light, a motion-sensing lamp cutting the room dark. These are properties
of the *observation at a moment*, not of a machine. A binary `free`/`occupied` label forces
the agent (and the labeller) to guess when the evidence isn't there, and a wrong `free` is
exactly the failure the product exists to prevent.

**Decision.**

- **State space:** `free` | `occupied` | **`unknown`** per machine per frame. `unknown` =
  not determinable from this evidence. The portal renders `unknown` as "unknown — check on
  arrival". (`out_of_order` deferred.)
- **Conditions are per-observation, not per-machine.** Label schema (full form in
  `docs/PROBLEM.md`): a frame object with `frame_conditions` (frame-wide list) and a
  `machines[]` array where each entry has `state`, `gt_determinate`, and optional
  `observation_notes` (per-machine list). Vocabularies are extensible.
- **Scoring:**
  - Primary = accuracy over observations with `gt_determinate: true`; an agent `unknown`
    there is incorrect.
  - Secondary = **harmful-error rate** (false `free` + false `occupied`); abstaining is not
    harmful.
  - Secondary = **coverage** and accuracy-on-covered.
  - `gt_determinate: false` observations are excluded from primary accuracy, counted
    separately.
- **Baseline** uses the same 3-way enum and the same scoring.

**Consequences.** The measurable agentic win is reframed: not just higher accuracy, but
**fewer harmful errors at comparable coverage** — verification and memory earn their place
by converting confident-but-wrong into an honest `unknown`. Reporting must always show
accuracy + harmful-error + coverage together so a high-abstention method can't look good on
accuracy-on-covered alone.

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
