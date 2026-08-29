# Verification-pass agent — retired experiment (Iteration 1)

- **Agent:** `runAgent` (`src/agent/pipeline.ts`) — a two-step vision pipeline:
  whole-frame classify, then a focused second call on the shaky machines.
- **Instructions file:** `classifyPrompt` + `verifyPrompt` in `src/agent/pipeline.ts`;
  thresholds in `src/config/defaults.ts` `agent.verification` (`enabled`,
  `confidenceThreshold: 0.7`).
- **Trigger:** `npm run eval -- --mode=agent --split=evaluation --live` (2026-08-28,
  9-frame set).
- **Model:** `claude-haiku-4-5`. Recorded cache `data/cache/agent/` + report
  `eval-agent-2026-08-28.json` — **removed in the 2026-08-29 recut**; both are recoverable
  from git history before 2026-08-29. The report (with full per-frame predictions) is kept
  at `docs/artifacts/historical/eval-agent-2026-08-28.json`.
- **Status:** wired but not carried into the recalibrated eval. `--mode=agent` still
  dispatches to `runAgent`; there is no committed cache for the current 5-frame set, so
  `--mode=agent --replay` only reproduces from the pre-recut history.

## What the agent does

1. **Classify** — `classifyPrompt(machineIds)`, one whole-frame call, per-machine state +
   confidence (same call as the baseline).
2. **Select** — machines that came back `unknown`, or below `confidenceThreshold` (0.7).
3. **Verify** — a second focused call naming those machines and listing explicit
   out-of-order / occupied / free cues ("dim or dead 7-segment segments — read the shape,
   don't over-read"). Its answers **override** pass 1. An answered machine still below half
   the threshold is dropped to `unknown` (abstain floor).

## Result — 9-frame set (retired), 14 calls, $0.051

| Metric | Baseline | Verify pass | Δ |
| --- | --- | --- | --- |
| Accuracy (45 determinate) | 62.2 % | **57.8 %** | **−4.4 pp** |
| Harmful-error rate | 2.2 % | **0.0 %** | −2.2 pp |
| Coverage | 95.6 % | **100 %** | +4.4 pp |
| `out_of_order` recall | 0 / 8 | **0 / 8** | 0 |

### The feedback that killed it — per-cell flips

Diffing the recorded baseline vs verify-pass predictions:

- **Resolved (good):** the 2 baseline `unknown`s → correct (`img_1819` W-06, W-07: `unknown`
  → `free`), and the one baseline harmful error cleared. This is the +coverage / −harmful
  line.
- **Over-committed (bad):** the verify pass flipped **correctly-`free` machines to
  `occupied`** — `img_1819` W-02, W-03 and `img_1823` W-16 among them — because a second
  "look harder" call on a lit standby panel talks itself into a cycle. Net accuracy drops.
- **No movement on the core failure:** `out_of_order` stayed 0 / 8. A focused re-read still
  cannot tell an `E rot` hard-error display from a running countdown.

On `claude-sonnet-5` (archived at commit `e8de845`, lightly-blurred earlier frames) the same
pass looked better — harmful 11.1 % → 8.9 %, `out_of_order` 0 / 8 → 2 / 8 — but that gain did
not survive the move to the cost-appropriate ship model.

## Outcome

- **Removed as the final answer.** Net-negative on the primary metric on the model we ship;
  its only wins (coverage, harmful) are also delivered — without the accuracy cost — by the
  integrator-correction layer.
- **Kept in-tree** (`runAgent`, `--mode=agent`) as a studied negative result. Not re-run on
  the recalibrated 5-frame set; the conclusion (a verification pass over-commits
  `free`→`occupied`) is not model- or frame-specific.
- The lesson fed the hot take: a step that *looks* like progress (a verifier) showed up as a
  regression only because `harmful` / coverage / `out_of_order` were scored separately. See
  `docs/CHANGELOG.md` "Historical — Baseline → Iteration 1 → Iteration 2".
