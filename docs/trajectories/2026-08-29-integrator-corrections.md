# Integrator-correction loop — the improvement (Iteration 2)

- **Component:** `writeCorrection` / `applyCorrections` (`src/eval/corrections.ts`),
  exposed as `npm run correct` (`scripts/correct.ts`) and `POST /api/corrections`
  (`src/app/api/corrections/route.ts`); fused into the room view by `buildRoomStatus`
  (`src/portal/room-status.ts`).
- **Instructions / contract:** D-0014. A correction is an **authoritative post-hoc
  override**, not a model weight and not a training signal. `observation`-scope fixes one
  `(frameId, machineId)`; `machine`-scope encodes a durable property and applies to that
  machine in **every** frame and every future capture.
- **Human checkpoint:** the integrator decides a cell is wrong and what the true state is,
  and whether it is durable (tick "applies to this machine in every view"). No model call.
- **Trigger (eval):** `npm run eval -- --mode=baseline --split=evaluation --replay
  --corrections`. **Trigger (portal):** `/integrator` → "✕ mark wrong" → pick state → submit.
- **Model:** none — the layer is free and offline-reproducible.

## The trajectory

1. **Baseline run leaves a systematic error.** `--mode=baseline` scores 45.5 %; the
   confusion matrix shows `out_of_order` recall **0 / 5** — every broken machine is read as a
   running cycle. Prompting, calibration images, and per-machine ROI crops were all tried
   against this and none moved it (see the sibling trajectories).
2. **Integrator inspects the frames and records 3 durable facts.** On `/integrator` each card
   shows the agent's state, confidence, and source frame. Three machines are physically out
   of service; the integrator marks each one wrong, sets state = `out_of_order`, ticks
   durable:

   | machine | note (`data/corrections/`) |
   | --- | --- |
   | `W-04` | "taped off, powered down across all frames" |
   | `D-02` | "hard error code on display, not a running cycle" |
   | `D-06` | "out of service every frame it appears in" |

3. **`POST /api/corrections` writes `data/corrections/<frame>.json` and returns the re-fused
   room.** The card flips immediately and gets an **integrator** badge; a durable correction
   carries to every other view of that machine.
4. **Re-score with the same store.** `applyCorrections` overlays the 3 `machine`-scope
   entries on the baseline predictions before scoring.

## Result — `--replay --corrections`, no model cost

The 3 corrections flip **5 cells** across cameras C-01–C-04:

| frame | machine | GT | baseline | after correction |
| --- | --- | --- | --- | --- |
| img_1819 | W-04 | out_of_order | free | out_of_order ✓ |
| img_1821 | D-02 | out_of_order | occupied | out_of_order ✓ |
| img_1821 | D-06 | out_of_order | occupied | out_of_order ✓ |
| img_1822 | D-02 | out_of_order | occupied | out_of_order ✓ |
| img_1823 | D-06 | out_of_order | occupied | out_of_order ✓ |

| Metric | Baseline | + corrections | Δ |
| --- | --- | --- | --- |
| Accuracy (22 determinate) | 45.5 % | **68.2 %** | **+22.7 pp** |
| `out_of_order` recall | 0 / 5 | **5 / 5** | +5 |
| Harmful-error rate | 9.1 % | **4.5 %** | −4.5 pp |
| Coverage | 100 % | 100 % | 0 |

## Outcome — kept, and it is the contribution

- **Read the delta honestly:** a correction is human ground truth applied as an override, so
  each corrected cell scores 100 % by construction. "+22.7 pp" = "an integrator overrode 5 of
  22 cells to their known value." On the **17 cells no correction touches** the model scores
  **10 / 17 = 58.8 %** — that is the model-capability number.
- What the delta legitimately shows: the `out_of_order` failure is real, is fixed by none of
  prompting / image calibration / ROI cropping, and **one durable fact per broken unit clears
  it in every camera angle and every future capture, for free**.
- **Follow-up — the loop is now built (Iteration 3).** On its own the override is a patch:
  the model keeps making the mistake, the override keeps hiding it. `npm run synthesize`
  closes the loop — it turns each of these 3 corrections into a per-machine reading-rule the
  ROI agent consumes (`--mode=roi --fragments` → 63.6 %, the first automated config above the
  baseline, 4 of 5 gains held-out). See `docs/trajectories/2026-08-30-feedback-loop.md` and
  D-0014 "Status (2026-08-30)". A full number still needs a temporal / held-out capture set.
