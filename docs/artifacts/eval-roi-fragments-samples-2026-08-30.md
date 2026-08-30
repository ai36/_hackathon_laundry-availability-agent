# `--mode=roi --fragments` — sample spread (2026-08-30)

The D-0014 feedback loop: `npm run synthesize` turned the 3 integrator corrections
(`W-04`, `D-02`, `D-06`) into per-machine `promptFragment` reading-rules in
`data/machines.json`; `npm run eval -- --mode=roi --fragments` appends each rule to that
machine's ROI call. Model `claude-haiku-4-5`, 22 determinate observations, one per camera.

The synthesis run is frozen (`data/cache/synthesis/`, `npm run synthesize -- --replay`
reproduces the 3 fragments). The eval was run `--live` 3 times against those frozen
fragments:

| sample | accuracy | harmful-error | coverage | `out_of_order` recall |
| --- | --- | --- | --- | --- |
| 1 (committed — `data/cache/roi-fragments/`, `--replay`-reproducible) | 63.6 % | 4.5 % | 81.8 % | 3 / 5 |
| 2 (not committed — author-attested `--live` re-run) | 59.1 % | 18.2 % | 86.4 % | 3 / 5 |
| 3 (not committed — author-attested `--live` re-run) | 63.6 % | 4.5 % | 81.8 % | 3 / 5 |

**Only sample 1 has a committed cache and reproduces from `--replay`.** Samples 2–3 were
`--live` re-runs whose caches were discarded (each overwrote the previous); their figures are
author-attested, not reproducible. They are recorded here only to show the spread — the
noisy-harmful-error caveat that README / CHANGELOG footnote rests on these two runs.

**Accuracy 59–64 % (mean ~62 %)** — a clear, repeated lift over the baseline (45.5 %) and
plain ROI (40.9 %). `out_of_order` recall is **stable at 3 / 5** across all three (plain ROI
and baseline: 0 / 5). **Harmful-error is the noisy dimension** — sample 2 spiked to 18.2 %
when the fragment-guided model over-called three `free` cells as `occupied`; samples 1 and 3
held at 4.5 %. Read the harmful-error figure with that variance in mind.

## Where the committed sample's gain comes from (vs plain ROI, 5 cells fixed, 0 broken)

| cell | plain ROI | + fragments | attribution |
| --- | --- | --- | --- |
| `W-04` @ img_1819 | occupied | **out_of_order ✓** | **in-sample** — the fragment was synthesized from this exact frame (circular, like the override) |
| `D-02` @ img_1822 | occupied | **out_of_order ✓** | **transfer** — fragment came from img_1821; fixes an unseen frame of the same machine |
| `D-06` @ img_1823 | free | **out_of_order ✓** | **transfer** — same, fragment from img_1821 |
| `D-01` @ img_1822 | out_of_order | **occupied ✓** | **spillover** — `D-01` has no fragment; `D-02`'s rule ("a solid error display is not an active cycle; cycles show an animated countdown") shares its stacked-panel prompt and helped read `D-01`'s live cycle |
| `D-05` @ img_1823 | out_of_order | **occupied ✓** | **spillover** — `D-05` has no fragment; helped by `D-06`'s rule in the shared crop prompt |
| `D-09` @ img_1823 | occupied | unknown | no accuracy change (both wrong vs GT `free`); minor coverage loss |

**4 of the 5 fixes are on cells the fragments were not derived from** — held-out *spatially*
(a different frame, or a neighbouring machine), not temporally: all 5 frames are one capture
session. Excluding the one in-sample cell: **13 / 22 = 59.1 %**, still +13.6 pp over baseline
and +18.2 pp over plain ROI from those cells.

## Honest limits

- **n = 22, single committed sample** (plus 2 re-runs above). Small.
- **All 3 corrections are `out_of_order`** (durable "out of service" facts), so the
  synthesized rules are cues for spotting a broken machine — exactly the failure baseline and
  ROI could not crack, but not a test of a `free`↔`occupied` reading rule (no such correction
  exists on a machine that appears in two frames).
- **`out_of_order` recall is 3 / 5, not 5 / 5.** The rule-guided model still misreads the
  original `D-02` @ img_1821 and one other. The override (`--corrections`) gets 5 / 5 on
  those exact cells but does not generalise; the fragment generalises but is not a guarantee.
- A full measurement needs a **temporal / held-out capture set** (re-shoot the 5 angles at a
  different time) so the fragments are tested only on frames from after the corrections were
  made. That is the remaining step.
