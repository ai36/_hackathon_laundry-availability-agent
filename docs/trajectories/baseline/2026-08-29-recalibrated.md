# Baseline & calibrated trajectory — recalibrated eval, frame `img_1823` (camera C-04)

- **Agents:** `runBaseline` (`src/agent/baseline.ts`) and `runCalibrated`
  (`src/agent/calibrated.ts`).
- **Trigger:** `npm run eval -- --mode=baseline|calibrated --split=evaluation --live`
  (2026-08-29 recut — 5 camera-scoped frames).
- **Model:** `claude-haiku-4-5`. Served from `data/cache/{baseline,calibrated}/`;
  `--replay` reproduces byte-for-byte.

**Frame:** the dryer wall head-on. Camera **C-04** scopes it to **D-03–D-10** (8 ids;
`data/site-config.json`). Ground truth (`data/labels/img_1823.json`): D-03 free, D-04 free,
D-05 occupied, D-06 **out_of_order**, D-07 occupied, D-09 free; D-08, D-10 `unknown`
(indeterminate — dropped from accuracy). 6 determinate observations on this frame.

## Baseline — one whole-frame call, told the 8 ids

`baselinePrompt([D-03…D-10])`, whole frame, no calibration inputs.

| id | model | GT | verdict |
| --- | --- | --- | --- |
| D-03 | occupied ("Display shows '225'") | free | ✗ |
| D-04 | occupied ("Display illuminated, blue screen") | free | ✗ |
| D-05 | occupied ("'E-roL' or error code, screen lit") | occupied | ✓ |
| D-06 | occupied ("Display illuminated, active operation") | out_of_order | ✗ |
| D-07 | occupied | occupied | ✓ |
| D-09 | occupied | free | ✗ |

**2 / 6 on this frame.** The model calls every lit panel `occupied`: the `2.25` **price**
reads as a countdown (D-03, D-04, D-09 over-called), and the `E rot` **hard error** on D-06
reads as "active operation". Across all 5 frames: **45.5%**, harmful 9.1%, `out_of_order`
0/5.

## Calibrated — same call + C-04's annotated shot + analysis mask

`cameraClassifyPrompt(...)` with `extraImagePaths = [img_1823.annotated.jpg,
img_1823.mask.png]` and a prompt that says IMAGE 2 is a location map (never read state from
it) and IMAGE 3's clear windows are the panels to read in IMAGE 1.

| id | model | GT | verdict |
| --- | --- | --- | --- |
| D-03 | occupied ("225 visible → time remaining") | free | ✗ |
| D-04 | occupied | free | ✗ |
| D-05 | occupied ("40 visible → time remaining") | occupied | ✓ |
| D-06 | occupied ("time remaining visible") | out_of_order | ✗ |
| D-07 | occupied | occupied | ✓ |
| D-09 | occupied ("active cycle indicators") | free | ✗ |

**2 / 6 — no better here, and worse overall.** On the tighter camera banks the annotated
shot's flat colour blocks lead the model to answer `occupied` for machines whose panel it
never actually reads (`free` recall 0/10 across the set). Across all 5 frames: **31.8%**,
`free` recall 0/10, `out_of_order` 0/5 — **−13.7 pp vs the plain baseline**.

## Outcome

- Baseline is the fair reference: 45.5% / harmful 9.1% / `out_of_order` 0/5.
- Calibrated (annotated shot + mask as vision inputs) is a **documented dead-end** — recorded
  across `claude-haiku-4-5`, `claude-sonnet-5`, and four prompt phrasings, none beating
  baseline. Kept in-tree (`--mode=calibrated`, cache committed) so the negative result
  reproduces.
- The improvement comes from **integrator corrections** (D-0014): the 3 `machine`-scope "out
  of service" facts fix D-06 here and W-04/D-02 elsewhere — `out_of_order` 0/5 → 5/5,
  baseline 45.5% → 68.2%. See `docs/EVALUATION.md`.
