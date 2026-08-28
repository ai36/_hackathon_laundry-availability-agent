# laundry3

A project for the **micro1 Agentic Workflows Hackathon**. Deadline for a working solution:
2026-08-30 12:00 UTC-7.

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

- **Baseline** — one whole-frame vision call, told which machine ids are in the frame.
- **Agent (Iteration 1)** — classify the whole frame, then a **verification pass**: a second
  focused vision call on the machines that came back `unknown` or low-confidence, listing
  explicit out-of-order / occupied / free cues; its answers override the first pass. Then an
  abstain floor so a near-guess becomes an honest `unknown`.

### Results — `claude-sonnet-5`, 9 labelled frames, 45 determinate observations

| Metric | Baseline | Agent (Iter 1) | |
| --- | --- | --- | --- |
| Per-machine accuracy | 31.1% | 31.1% | tie (within run-to-run noise) |
| **Harmful-error rate** (told `free`, actually not) | 11.1% | **8.9%** | −2.2 pp |
| **Accuracy when it commits** | 51.9% | **60.9%** | +9.0 pp |
| Coverage (gave an actionable answer) | 60.0% | 51.1% | −8.9 pp |
| **`out_of_order` recall** | 0/8 | **2/8** | +2 |
| Cost per frame | ~$0.009 | ~$0.019 | ×2 |

The verification pass doesn't move raw accuracy, but it **halves the "wasted trip" errors**,
is more trustworthy when it does answer, and starts catching broken machines — at 2× cost
and lower coverage. One sample per mode; both are reproducible offline with `--replay`.
Full write-up with the removed dead-end: **`docs/CHANGELOG.md`**.

### Main failure mode & hot take

**Failure mode:** a verification step that re-asks "are you sure?" can *lose* a correct
answer. In Iteration 1 the verify prompt over-weighted "confirm the machine's printed id",
so machines with a readable running-cycle display but no visible id got downgraded from a
correct `occupied` to `unknown` — that's most of the coverage drop
(`docs/trajectories/runtime/2026-08-28-img_1825.md`).

**Hot take:** for this product the useful metric was never raw accuracy — it's *harmful*
errors and honest abstention. A confident-but-wrong "free" costs a real trip; an "unknown"
just reproduces today's uncertainty. Adding `unknown` + `out_of_order` as first-class states
and scoring harmful errors separately changed what "better" means, and made a verification
pass that *lowers* accuracy still clearly worth keeping. Build the metric around the cost of
each error before optimising the agent.

## How agents are used

- **The solution agent** (`src/agent/`) — a two-step vision pipeline (classify → verify),
  behind a `VisionClient` interface with a response cache so every scored run reproduces
  key-free (`--replay`).
- **`grillme`** skill — a Socratic interview that turned the one-line brief into the scoped
  problem, metric, and dataset plan (`docs/trajectories/` has the outcome; `docs/PROBLEM.md`
  the result).
- **`hackathon-compliance` subagent** (`.claude/agents/`) — an independent reviewer run on
  every change against `docs/HACKATHON-RULES.md`; it caught a reproducibility blocker (the
  cache keyed on image bytes) and several overclaims. Records under
  `docs/trajectories/compliance/`.
- **`find-skills`** — on-demand skill discovery.

Details: **`docs/SKILLS.md`**, **`docs/DECISIONS.md`** (D-0003, D-0004, D-0011–D-0013).

## Tech stack

TypeScript · Node 24 · Next.js 16 (App Router) · Tailwind CSS v4 · MobX 7 · `@anthropic-ai/sdk`.
Exact versions and rationale: `docs/DECISIONS.md` (D-0001).

## Quick start

```bash
npm ci
git config core.hooksPath .githooks          # dataset-privacy pre-commit gate
npm run eval -- --mode=baseline --split=evaluation --replay   # reproduce the baseline — no API key, no cost
npm run eval -- --mode=agent    --split=evaluation --replay   # reproduce the agent run
```

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`,
`npm test` (23), `npm run check:data`. Full clean-environment walkthrough (including a
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
src/app/, src/stores/, src/components/   Next.js portal shell + MobX (portal UI is P2)
scripts/            prepare-dataset · run-eval · label · gen-initial-labels · check-data-privacy
data/               raw/ (ignored) · public/frames/ (held out) · labels/ · splits/ · cache/ — see data/README.md
docs/               Hackathon deliverables (see the table below)
.claude/            Claude Code config: hackathon-compliance subagent, git-guard hook, /worklog
```

## Documentation

| File | What it holds |
| --- | --- |
| `docs/PROBLEM.md` | Problem, user, bottleneck, scope, definition of "good", privacy plan |
| `docs/CHANGELOG.md` | **Improvement Changelog** — baseline → Iteration 1, with evidence + removed dead-end |
| `docs/EVALUATION.md` | Metric, cases, rubric, known limitations, recorded results |
| `docs/REPRODUCTION.md` | Clean-environment setup, exact commands, expected output, runtime & cost |
| `docs/DECISIONS.md` | Decision log (D-0001 … D-0013) |
| `docs/CONFIGURATION.md` | Every deployment-config setting: type, default, meaning |
| `docs/LABELING.md` | How an integrator turns frames into ground truth |
| `docs/SKILLS.md` | Connected agent skills and when to use them |
| `docs/HACKATHON-RULES.md` | Full transcription of the hackathon rules |
| `docs/trajectories/` | Agent trajectory records — `runtime/` (solution agent), `compliance/` (reviewer) |
| `docs/WORKLOG.md` | Chronological record of every change |
| `CLAUDE.md` | Agent working agreement for this repo |

## What existed before the hackathon

Nothing. Created 2026-08-28. `create-next-app` provided the initial Next.js scaffold; every
other change is a dated entry in `docs/WORKLOG.md`.
