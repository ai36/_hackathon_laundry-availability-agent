# Solution video — script & shot list

Target length **~5:00**. Covers the six things the brief asks for: problem + baseline, one
realistic end-to-end execution, the final comparison, a changelog walkthrough, the change
that contributed most, and one experiment that was removed.

Record at 1920×1080. Everything shown is key-free and offline — `npm run dev` +
`npm run eval -- … --replay`. Have a terminal and a browser at `http://localhost:3000` ready.
Times are cumulative.

---

## 0:00 – 0:45 · The user and the bottleneck

**On screen:** `README.md` top section, then a photo/frame of the laundry room
(`data/public/frames/img_1821.jpg`).

**Narration:**
> A tenant in an apartment building with a shared laundry room. To do laundry they fill a
> bag, carry it down, and often find every machine busy — then carry it back and try again
> later, with no idea when anything frees up. There's no way to check before the trip and no
> way to hold a machine for the two minutes it takes to walk over.
>
> laundry3 reads the laundry-room cameras with an agent and publishes a per-machine
> **free / occupied / out-of-order / unknown** list, so the tenant only walks over when a
> machine is actually free.

## 0:45 – 1:30 · The baseline, and how we measure it

**On screen:** `docs/EVALUATION.md` metric section; then run
`npm run eval -- --mode=baseline --split=evaluation --replay` and let the summary print.

**Narration:**
> The baseline is the reasonable simple approach: one Claude vision call on the whole frame,
> told which machine IDs that camera covers. No cropping, no calibration, no memory.
>
> We built the metric *before* the agent. Primary metric is per-machine accuracy over 22
> determinate observations on 5 committed frames — one per camera. But we score three more
> things separately: **harmful-error rate** — telling a tenant a machine is free when it
> isn't; **coverage** — did we give an actionable answer; and **`out_of_order` recall** —
> did we catch the broken machines. Every run replays from a committed cache with no API key.
>
> Baseline: **45.5% accuracy, 9.1% harmful, `out_of_order` recall zero out of five.** The
> model reads every lit panel as a running cycle — including the always-on price display and
> the hard-error screens.

## 1:30 – 3:00 · One execution, end to end

**On screen:** `npm run dev`, then the browser.

1. **`/tenant`** — "This is what the tenant sees: free washer / dryer counts, per-machine
   state, and tapping a free machine opens a confirm dialog to hold it for a few minutes."
   Tap a free machine → confirm dialog → reserved; show the badge.
2. **`/integrator`** — "The building's integrator sees the same room plus the agent's
   confidence and the source frame for every card, and a **mark-wrong** control." Scroll to a
   machine that's actually taped off but shows as `free` or `In use`.
3. **Mark wrong** → pick `out of order` → tick **"applies to this machine in every view
   (durable)"** → add the note "taped off" → submit. "That writes one authoritative fact.
   The card flips immediately and gets an integrator badge, and because it's durable it
   carries to every camera that sees this machine and every future capture."
4. **Back in the terminal:**
   `npm run eval -- --mode=baseline --split=evaluation --replay --corrections`
   "Re-scoring with the same three corrections on file."

**Narration over the last result:**
> **68.2% accuracy. `out_of_order` recall five out of five. Harmful-error halved to 4.5%.**
> Three durable facts, recorded once, no extra model cost.

## 3:00 – 3:40 · The comparison

**On screen:** the table from `docs/CHANGELOG.md` "Recalibrated evaluation".

| Metric | Baseline | + integrator corrections |
| --- | --- | --- |
| Per-machine accuracy (n=22) | 45.5% | **68.2%** |
| Harmful-error rate | 9.1% | **4.5%** |
| `out_of_order` recall | 0 / 5 | **5 / 5** |
| Model cost per frame | ~$0.003 | ~$0.003 |

**Narration:**
> Read the delta honestly: a correction is human ground truth applied as an override, so
> each corrected cell scores 100% by construction. Plus-22.7 points means an integrator
> overrode 5 of 22 cells. On the 17 cells no correction touches, the model scores 10 out of
> 17. What the number legitimately shows is that the broken-machine failure is real, nothing
> we tried on the model side fixed it, and one fact per broken unit clears it everywhere for
> free.

## 3:40 – 4:30 · Changelog, and the experiment we removed

**On screen:** `docs/CHANGELOG.md` Progression table.

**Narration:**
> Four experiments between baseline and result.
>
> **Iteration 1 — a verification pass:** classify, then a focused second call on the shaky
> machines. It cleared the harmful error and filled coverage — but it *over-committed*,
> flipping correctly-free machines to occupied, so accuracy dropped 4.4 points. **Removed** —
> kept in the tree as a studied negative result.
>
> **Calibration by images:** feed the camera's annotated shot and mask as extra vision
> inputs. **Minus 13.7 points** — the model reads state off the flat-colour annotation. A
> documented dead-end.
>
> **ROI:** crop the frame to each machine's own colour region in an integrator-painted map,
> one call per machine — no positional guessing. The right architecture, but haiku still
> can't OCR small worn displays in wide angled shots: 40.9%, a consistent ~4.6-point
> shortfall. Kept as an iteration.
>
> The verification pass is the one to look at: it *looked* like progress. Separate harmful /
> coverage / `out_of_order` scoring is the only reason we saw it was a regression.

## 4:30 – 5:00 · The change that mattered, and the hot take

**Narration:**
> The change that contributed most wasn't a cleverer prompt or a richer input — two of those
> made things worse. It was letting an integrator write three authoritative facts the model
> kept getting wrong, and building a metric that could tell a real improvement from a demo.
>
> **Hot take:** decide what each error costs the user, encode it in the metric before you
> build the agent, and then let the metric — not the demo — tell you whether the agent is
> better. And know when to stop asking the model: some failures a human should just overrule
> once, not have the agent re-litigate every frame.
>
> Honest gap: as shipped the override is permanent — the model keeps making the mistake. The
> designed fix is a loop that turns a durable correction into a per-machine prompt hint; it's
> deferred because measuring it needs a held-out capture split we don't have yet. That's the
> first thing after the hackathon.

---

## Capture checklist

- [ ] `npm run dev` running; `data/corrections/` has exactly the 3 committed entries
      (`npm run correct -- --list`)
- [ ] terminal font large enough to read at 1080p
- [ ] browser at 1920×1080, `/tenant` and `/integrator` pre-loaded
- [ ] after recording the mark-wrong demo, `git checkout -- data/corrections/` if you added a
      throwaway correction
- [ ] all `--replay` commands run with no `ANTHROPIC_API_KEY` set, to prove key-free
