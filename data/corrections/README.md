# data/corrections/

Integrator corrections — human-supplied ground truth that overrides the agent's prediction
(D-0014). Committed: small, and it *is* the ground truth an integrator vouches for.

One file per frame, `<frameId>.json`:

```json
{
  "frameId": "img_1821",
  "corrections": [
    {
      "machineId": "D-06",
      "correctState": "out_of_order",
      "scope": "machine",
      "note": "out of service every frame it appears in",
      "by": "integrator",
      "at": "2026-08-28T21:14:03.000Z"
    }
  ]
}
```

## Scope

- **`observation`** (default) — fixes this one `(frameId, machineId)`. Use for `free` /
  `occupied`, which change over time.
- **`machine`** — a durable property of the physical unit (`out_of_order`, a removed
  machine). Applies to that `machineId` in **every** frame, in every camera angle and every
  later capture, until the entry is removed. Stored in whichever frame file the integrator
  was looking at; `loadCorrections()` promotes it to all frames on read.

An `observation`-scope entry wins over a `machine`-scope one for its own frame.

## Recording one

```bash
npm run correct -- <frameId> <machineId> <state> [--scope=machine] [--note="..."]
npm run correct -- --list                     # review what's on file
```

`state` is `free | occupied | out_of_order | unknown`. Re-running for the same
`(frame, machine)` replaces the earlier entry.

## Using them in the eval

```bash
npm run eval -- --mode=agent --split=evaluation --replay --corrections
```

applies the store before scoring and writes `docs/artifacts/eval-agent-corrected-<date>.json`.
See `docs/EVALUATION.md` for the recorded Iteration 2 result (3 corrections → accuracy
57.8% → 75.6%, `out_of_order` recall 0/8 → 8/8).
