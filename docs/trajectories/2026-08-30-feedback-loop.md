# Correction → `promptFragment` feedback loop — Iteration 3 (first automated config above baseline on this set)

- **Components:** `synthesizeFragment` (`src/eval/prompt-synthesis.ts`, `npm run synthesize`)
  and `runRoi(..., fragments)` (`src/agent/roi.ts`, `npm run eval -- --mode=roi --fragments`).
- **Instructions / contract:** D-0014, "Status (2026-08-30)". A correction is synthesised
  into a per-machine **reading-rule** (a visual cue, not a state assertion) stored as that
  machine's `promptFragment`; the ROI agent appends it to that machine's call.
- **Trigger:** `npm run synthesize -- --live` then `npm run eval -- --mode=roi --fragments
  --live` (2026-08-30). Both `--replay`-reproducible from `data/cache/{synthesis,roi-fragments}/`.
- **Model:** `claude-haiku-4-5`. Reports `docs/artifacts/eval-roi-fragments{,-corrected}-2026-08-30.json`.

## The trajectory

1. **Plain ROI is 40.9 %, below the 45.5 % baseline** — `claude-haiku-4-5` cannot read the
   small / worn 7-segment displays in the wide angled shots, and `out_of_order` recall is
   0/5. Prompt variants (Iteration ROI) bounced in noise; the crop mechanism is right but the
   model needs a per-machine hint.
2. **`npm run synthesize -- --live`** — for each of the 3 corrected cells where the baseline
   was wrong (`W-04`, `D-02`, `D-06`), one vision call takes:
   - the model's own wrong rationale from `eval-baseline-2026-08-29.json`
   - the correction (`out_of_order`) + the integrator's note
   - the source frame
   and returns a reading-rule. The 3 results (written to `data/machines.json`,
   `fragmentSource: "synthesis"`, $0.0065):

   | machine | synthesised rule (abridged) |
   | --- | --- |
   | `W-04` | tape across the door/panel, or a dark display while neighbours are lit → out_of_order |
   | `D-02` | a solid error display is **not** an active cycle; cycles show an animated countdown with a blinking colon |
   | `D-06` | a lit display alone ≠ running; check for physical OUT OF SERVICE signage / tape |

3. **`npm run eval -- --mode=roi --fragments --live`** — `run-eval` builds the `machineId →
   fragment` map from the roster and passes it to `runRoi`, which appends each rule to that
   machine's crop prompt (`+frag` folded into the cache key; plain `--mode=roi` cache
   untouched).

## Result — 16 calls, `--replay --fragments`-reproducible

| config | accuracy | harmful | coverage | `out_of_order` |
| --- | --- | --- | --- | --- |
| baseline | 45.5 % | 9.1 % | 100 % | 0 / 5 |
| plain ROI | 40.9 % | 9.1 % | 86 % | 0 / 5 |
| **ROI + fragments** | **63.6 %** | 4.5 %¹ | 82 % | **3 / 5** |
| ROI + fragments + corrections | **72.7 %** | 4.5 % | 86 % | 5 / 5 |

¹ 3 live samples of the frozen fragments: accuracy 63.6 / 59.1 / 63.6 %, harmful 4.5 / 18.2 /
4.5 %, `out_of_order` 3/5 all three (`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`).

### Where the +22.7 pp over plain ROI comes from — 5 cells fixed, 0 broken

| cell | plain ROI → + fragments | attribution |
| --- | --- | --- |
| `W-04` @ img_1819 | occupied → **out_of_order ✓** | **in-sample** — rule synthesised from this exact frame (circular, like the override) |
| `D-02` @ img_1822 | occupied → **out_of_order ✓** | **cue-consistency** — rule from img_1821, applied to a *different* frame of the same broken unit showing the *same* hard-error cue (not open-ended generalisation) |
| `D-06` @ img_1823 | free → **out_of_order ✓** | **cue-consistency** — same |
| `D-01` @ img_1822 | out_of_order → **occupied ✓** | **spillover** — `D-01` has no rule; `D-02`'s rule ("a solid error display is not an active cycle") shares its stacked-panel prompt and fixed the false error call |
| `D-05` @ img_1823 | out_of_order → **occupied ✓** | **spillover** — `D-05` has no rule; helped by `D-06`'s rule in the shared crop prompt |

**4 of 5 fixes are on cells the rule was not derived from** — 2 cue-consistency (same broken
unit, same cue, different frame), 2 genuine cross-machine spillover. All 5 frames are one
capture session, so this is *spatial*, not a *temporal* split. Excluding the one in-sample
cell: 13 / 22 = **59.1 %**, still +13.6 pp over baseline.

## Outcome — kept, Iteration 3

- **The first automated configuration to clear the baseline on this set** — all 3 loop
  samples (63.6 / 59.1 / 63.6 %) beat 45.5 %; on these cells the model itself reads them
  right once given the rule, no override. The **+18.2 pp** is one committed loop sample vs
  one baseline sample — the baseline was not re-sampled.
- The override (`--corrections`) is still higher *on the 5 corrected cells* (it is ground
  truth there, 5/5 vs the loop's 3/5) but does not generalise; the loop generalises but is
  not a guarantee. Together: 72.7 %.
- **Honest limits:** n = 22, one committed sample; all 3 corrections are `out_of_order`, so
  the rules are broken-machine cues, not a `free`↔`occupied` reading-rule test; harmful-error
  is noisy across samples. A full number needs a temporal / held-out capture set — re-shoot
  the 5 angles at a different time so the rules are scored only on post-correction frames.
- **Not yet wired:** the synthesis trigger into `POST /api/corrections` (it is a CLI); the
  live `/api/refresh` path still uses the plain baseline call. See `docs/DECISIONS.md`
  D-0014.
