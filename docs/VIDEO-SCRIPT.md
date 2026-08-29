# Solution video — script & shot list

Solo submission — first person throughout ("I", not "we"). Target length **~5:00**. Covers
the six things the brief asks for: problem + baseline, one realistic end-to-end execution,
the final comparison, a changelog walkthrough, the change that contributed most, and one
experiment that was removed.

Record at 1920×1080. Everything shown is key-free and offline — `npm run dev` +
`npm run eval -- … --replay`. Have a terminal and a browser at `http://localhost:3000` ready.
Times are cumulative.

---

## 0:00 – 0:45 · The user and the bottleneck

**On screen:** `README.md` top section, then a frame of the laundry room
(`data/public/frames/img_1821.jpg`).

**Narration:**
> A tenant in an apartment building with a shared laundry room. To do laundry they fill a
> bag, carry it down, and often find every machine busy — then carry it back and try again
> later, with no idea when anything frees up. There's no way to check before the trip, and no
> way to hold a machine for the two minutes it takes to walk over.
>
> laundry3 reads the laundry-room cameras with an agent and publishes a per-machine
> **free / occupied / out-of-order / unknown** list, so the tenant only walks over when a
> machine is actually free.

## 0:45 – 1:30 · The baseline, and how I measure it

**On screen:** `docs/EVALUATION.md` metric section; then run
`npm run eval -- --mode=baseline --split=evaluation --replay` and let the summary print.

**Narration:**
> The baseline is the reasonable simple approach: one Claude vision call on the whole frame,
> told which machine IDs that camera covers. No cropping, no calibration, no memory.
>
> I built the metric *before* the agent. The primary metric is per-machine accuracy over 22
> determinate observations on 5 committed frames — one per camera. Three more things are
> scored separately: **harmful-error rate** — telling a tenant a machine is free when it
> isn't; **coverage** — did it give an actionable answer; and **`out_of_order` recall** —
> did it catch the broken machines. Every run replays from a committed cache with no API key.
>
> Baseline: **45.5% accuracy, 9.1% harmful, `out_of_order` recall zero out of five.** The
> model reads every lit panel as a running cycle — including the always-on price display and
> the hard-error screens.

## 1:30 – 3:00 · One execution, end to end

**On screen:** `npm run dev`, then the browser.

1. **`/tenant`** — "This is what the tenant sees: free washer and dryer counts, per-machine
   state, and tapping a free machine opens a confirm dialog to hold it for a few minutes."
   Tap a free machine → confirm dialog → reserved; show the badge.
2. **`/integrator`** — "The building's integrator sees the same room, plus the agent's
   confidence and the source frame for every card, and a **mark-wrong** control."
   Scroll to a machine that is physically taped off but reads `free` or `In use`.
3. **Mark wrong** → pick `out of order` → tick **"applies to this machine in every view
   (durable)"** → note "taped off" → submit. "The card flips immediately and gets an
   integrator badge. Because it's durable, it carries to every camera that sees this machine
   and every future capture. This is the correction — one authoritative fact the integrator
   records once."
4. **Back in the terminal:**
   `npm run eval -- --mode=baseline --split=evaluation --replay --corrections`
   "Re-scoring the same baseline predictions with the three corrections on file."

**Narration over the last result:**
> **68.2% accuracy. `out_of_order` recall five out of five. Harmful-error halved to 4.5%** —
> at no extra model cost.

## 3:00 – 3:40 · The comparison — and what it is, and isn't

**On screen:** the table from `docs/CHANGELOG.md` "Recalibrated evaluation".

| Metric | Baseline | + integrator corrections (shipped) |
| --- | --- | --- |
| Per-machine accuracy (n=22) | 45.5% | **68.2%** |
| Harmful-error rate | 9.1% | **4.5%** |
| `out_of_order` recall | 0 / 5 | **5 / 5** |
| Model cost per frame | ~$0.003 | ~$0.003 |

**Narration:**
> Be honest about this delta. A correction is human ground truth applied as an override, so
> each corrected cell scores 100% by construction. Plus-22.7 points means an integrator
> overrode 5 of 22 cells. On the 17 cells no correction touches, the model still scores 10
> out of 17.
>
> So the override on its own is not the solution — it's a **stopgap**. Nobody wants to
> hand-correct a model forever. What it *is* is the first, guaranteed step of the design, and
> the signal that design learns from. More on that in a moment.

## 3:40 – 4:30 · Changelog, and the experiment I removed

**On screen:** `docs/CHANGELOG.md` Progression table.

**Narration:**
> Before the corrections layer I tried three automated improvements on the model side. None
> beat the baseline.
>
> **A verification pass** — classify, then a focused second call on the shaky machines. It
> cleared the harmful error and filled coverage, but it *over-committed*, flipping
> correctly-free machines to occupied, so accuracy dropped 4.4 points. **Removed** — kept in
> the tree as a studied negative result.
>
> **Calibration by images** — feed the camera's annotated shot and mask as extra vision
> inputs. **Minus 13.7 points.** A documented dead-end.
>
> **ROI** — crop the frame to each machine's own colour region and classify one machine per
> call, no positional guessing. The right architecture, but the model still can't OCR small
> worn displays in wide angled shots: 40.9%, a consistent shortfall. Kept as an iteration.
>
> The verification pass is the one to look at: it *looked* like progress. Separate harmful,
> coverage, and `out_of_order` scoring is the only reason I could see it was a regression.

## 4:30 – 5:15 · The intended solution, the honest gap, and the hot take

**On screen:** `docs/DECISIONS.md` D-0014, the "Status (2026-08-29)" note.

**Narration:**
> The intended solution is a **closed correction loop**. The integrator's durable correction
> does two things: it overrides the reading now — the guaranteed fix you just saw — and it
> triggers synthesis of an **improvable per-machine prompt fragment**: the model is told,
> for that one machine, how to read its display correctly next time. Over a few corrections
> the model stops making the mistake and the override is no longer needed. Human input trains
> an improvable prompt, per machine, without fine-tuning.
>
> **That loop is designed but not built** — it's in the decision log, D-0014. Building it
> well needs a temporal, held-out capture split to prove that *future* captures classify
> right without a human, and the 5 frozen frames don't have one. So it's deferred as the
> first post-hackathon iteration. What ships today is the override — the +22.7-point stopgap
> and the training signal the loop would consume.
>
> **Hot take:** build the metric before the agent, and be willing to log a negative result —
> two changes that looked like progress were regressions, and only per-error-type scoring
> showed it. And the real agentic design here isn't a cleverer one-shot prompt. It's the
> loop: a human overrules a specific failure once, and that correction improves how the model
> reads that machine from then on.

---

## Capture checklist

- [ ] `npm run dev` running; `data/corrections/` has exactly the 3 committed entries
      (`npm run correct -- --list`)
- [ ] terminal font large enough to read at 1080p
- [ ] browser at 1920×1080, `/tenant` and `/integrator` pre-loaded
- [ ] after recording the mark-wrong demo, `git checkout -- data/corrections/` if you added a
      throwaway correction
- [ ] all `--replay` commands run with no `ANTHROPIC_API_KEY` set, to prove key-free
- [ ] first person throughout — "I", not "we"
