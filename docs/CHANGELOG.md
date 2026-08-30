# Improvement Changelog

The story of how this solution evolved, per the hackathon brief. Start from the simple
baseline, add one entry per meaningful experiment, tie each to evidence, and record the
decision it led to. Include experiments that were later removed and what they taught us.

## Evaluation method

- **State space:** `free` / `occupied` / `out_of_order` / `unknown` per machine per frame
  (`out_of_order` = broken/taped off; `unknown` = not determinable). Conditions (person
  blocking indicator, low light, lamp off) are per-observation, not per-machine — see
  `docs/DECISIONS.md` D-0006 (+ amendment).
- **Primary metric:** overall per-machine state accuracy over determinate ground truth on a
  labelled laundry-room frame set. Secondary: **harmful-error rate** (false free/occupied),
  **coverage**, tokens / cost per frame. Full plan in `docs/EVALUATION.md`.
- **Cases:** target ≥10 P0 single-frame cases across states × conditions (`out_of_order`,
  low-light, occlusion — full list in `docs/EVALUATION.md`). **Actual (recalibrated
  2026-08-29):** 5 labelled still frames, one per calibrated camera C-01…C-05
  (`data/splits/evaluation.txt`) = 24 machine-observations, 22 determinate. Each camera
  scopes its frame to the machines it is responsible for; baseline and calibrated are scored
  on that same scope. _(The earlier set was 9 unscoped frames / 45 determinate — see the
  "Recalibrated evaluation" section for what changed and why.)_
- **Baseline:** single Claude vision prompt on the whole frame, told the camera's machine-id
  list; contextual baseline = the manual "walk over and check" process.
- **Harness:** `npm run eval -- --mode=baseline|agent|calibrated|roi --split=evaluation
  --live|--replay [--fragments] [--corrections]`. `--replay` re-scores from
  `data/cache/<mode>/` with no API key — verified to reproduce the committed reports
  byte-for-byte. `--fragments` (ROI only) appends the D-0014 synthesised `promptFragment`s;
  `npm run synthesize` produces them from `data/corrections/`.

## Progression

| Stage | What we tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Setup | Bootstrapped project infra: Next.js 16 + TS + Tailwind v4 + MobX, skills `find-skills` + `grillme`, docs/logging scaffold. Not an iteration on the solution — the starting line. | `npm run typecheck` / `lint` / `build` results below | Infra in place; next step is to define the problem and build the baseline. |
| Scoping | Ran the `grillme` Socratic-interview skill to turn "laundry3" into a defined problem, user, MVP, metric, baseline, dataset plan, and phased scope. | `docs/PROBLEM.md`, `docs/EVALUATION.md`, D-0005 | Problem pinned: per-machine free/occupied status from laundry-room frames; core = agent → verified status list. |
| Baseline (9-frame set — retired) | Single `claude-haiku-4-5` vision call per frame on the whole downscaled + author-redacted image; given the frame's machine-id list + numbering convention, no ROI / calibration / memory / verification. | **accuracy 62.2%**, harmful-error 2.2%, coverage 95.6%, acc-on-covered 65.1% (45 determinate obs, 9 frames). Report kept at `docs/artifacts/historical/eval-baseline-2026-08-28.json` (the run's `data/cache/baseline/` is recoverable at the pre-2026-08-29 git history). Cost $0.035. Single sample. | The model reads lit displays confidently: gets the genuinely-occupied machines right (10/10) but **over-calls `free` machines with a lit standby panel as `occupied`** (7/27) and **never identifies `out_of_order`** (0/8 — the "E" error code reads as an active cycle). One harmful error. |
| Iteration 1 (P0) | **Verification pass**: after the whole-frame classify, a second focused vision call on the machines that came back `unknown` or low-confidence, naming them and listing explicit out-of-order / occupied / free cues (incl. "dim or dead 7-segment segments — read the shape, don't over-read"). Its answers override pass 1. `npm run eval -- --mode=agent --split=evaluation`. | accuracy **57.8%** (baseline 62.2% — **−4.4 pp**), **harmful-error 0.0%** (baseline 2.2%), coverage **100%** (baseline 95.6%), acc-on-covered 57.8% (baseline 65.1%), `out_of_order` **0/8** (unchanged). 14 calls, $0.051 (1.4× baseline). Single sample. | **Mixed — net-negative on the primary metric.** The verify pass resolves the 2 baseline `unknown`s and clears the one harmful error, but it *over-commits*: it flips 4 correctly-`free` machines to `occupied`, so raw accuracy drops. It still cannot tell a broken machine from a running one. On `claude-sonnet-5` (archived at commit `e8de845`, on the earlier lightly-blurred frames) the same pass looked better — harmful 11.1%→8.9%, `out_of_order` 0/8→2/8 — but on the cost-appropriate model it is not a clear win. **Not shipped as the final answer.** Next: a human-in-the-loop correction store (Iteration 2), which is what actually moves `out_of_order`. |
| Iteration 2 (P0) | **Integrator corrections** (D-0014). The integrator marks a machine wrong once; the correction is stored (`data/corrections/`) and applied as an authoritative override. `observation`-scope fixes one (frame, machine); `machine`-scope (for durable properties like `out_of_order`) applies to that machine in **every** frame. | **3 `machine`-scope corrections** (`W-04`, `D-02`, `D-06` = "out of service"). On the 9-frame set: accuracy **57.8% → 75.6%**, **`out_of_order` recall 0/8 → 8/8**, no extra model cost (post-hoc). Report kept at `docs/artifacts/historical/eval-agent-corrected-2026-08-28.json`. The same 3 corrections carry to the recalibrated set — see the row below. | **Kept — the improvement.** The vision model can't distinguish a hard-error display from a running cycle; one durable fact per broken machine fixes it in every angle and every future capture. Ceiling: the remaining errors are `free`→`occupied` over-calls, time-varying (`observation`-scope) — per-frame hand-labelling, not learning, left as the honest limit. |
| Recalibration (2026-08-29) — dataset | Rebuilt the eval around the D-0015 calibration model: 5 committed stills, one per camera C-01…C-05, each re-retouched, each with a `camera` field in its label. `data/site-config.json` scopes every camera to the machines it owns + carries its annotated shot and analysis mask. Dropped the 4 close-up frames that no camera covered. New eval mode `--mode=calibrated`; baseline re-run on the new scoped set. | Baseline (`claude-haiku-4-5`, whole frame + scoped id list): **accuracy 45.5%**, harmful-error 9.1%, coverage 100%, `out_of_order` 0/5 (22 determinate obs / 5 frames). `docs/artifacts/eval-baseline-2026-08-29.json`, cache `data/cache/baseline/` (5). | Smaller, harder set — the 5 frames concentrate the dryer-wall panels and every `out_of_order` case. `free`→`occupied` over-call (6/10) and `out_of_order` 0/5 are the same failures as before, sharper. The old 9-frame numbers (62.2 / 57.8 / 75.6 / 80.0) do not carry over and are retired. |
| Recalibration (2026-08-29) — calibrated agent | **Feed the camera's annotated shot + analysis mask as extra vision inputs**, with a prompt that names them ("IMAGE 2 is a location map — never read state from it; IMAGE 3 is a mask — its clear windows are the panels to read in IMAGE 1"). `npm run eval -- --mode=calibrated`. | accuracy **31.8%** (baseline 45.5% — **−13.7 pp**), harmful-error 0.0%, coverage 100%, `out_of_order` 0/5. `docs/artifacts/eval-calibrated-2026-08-29.json`, cache `data/cache/calibrated/` (5). Also tried on `claude-sonnet-5` (31.8%) and across four prompt phrasings (27–36%); none beat the plain baseline. | **Removed — a documented dead-end.** The model reads state off the flat-colour annotation ("Red washer… control panel visible → occupied"), and the mostly-black mask image drives it to answer `occupied` for every machine (`free` recall 0/10). The 0% harmful rate is an artefact of never saying `free`, not a safety gain. Kept in-tree (`--mode=calibrated`, cache committed) so the negative result reproduces. What calibration *did* leave: per-camera machine scoping, which is neutral. |
| Recalibration (2026-08-29) — ROI agent | **Per-machine crops.** The integrator paints each machine's body/panel one solid colour in a region-map PNG (`camera.mask`) + a `hex → id` `maskLegend`; `--mode=roi` (`src/agent/roi.ts`) reads it (nearest-colour match), crops the live frame to each machine's region — stacked pairs cropped together on the shared panel — and classifies one machine (or one pair) per call. No positional inference: id follows the painted colour, so camera angle / stack layout do not matter. | accuracy **40.9%** (baseline 45.5% — **−4.6 pp**), harmful-error 9.1%, coverage 86.4%, `out_of_order` 0/5, 16 calls, ~$0.02. `docs/artifacts/eval-roi-2026-08-29.json`, cache `data/cache/roi/`. Frozen config is **stable at 40.9% across 3 samples** (`eval-roi-samples-2026-08-29.md`); +corrections 63.6%. | **Kept as an iteration — the right architecture, a small measured shortfall.** As frozen it is a consistent ~4.6 pp below the baseline: it visibly helps on the front-on camera (C-01, 3–4/4) and on `free` precision (tight crop + a "2.25 is a price, not a countdown" rule), but `claude-haiku-4-5` can't reliably read the small / worn 7-segment displays in the wide angled shots (C-02: 1/7, C-03: 0/2), and `out_of_order` stays 0/5. Earlier prompt variants reached ~50–54% — by guessing more (harmful-error up to 13.6%). The improvement path stays the corrections layer. |
| Recalibration (2026-08-29) — integrator corrections | **Same 3 `machine`-scope corrections** (`W-04`, `D-02`, `D-06` = "out of service"), re-scored on the new set. `--replay --corrections`. | Baseline + corrections: accuracy **45.5% → 68.2%** (+22.7 pp), `out_of_order` recall **0/5 → 5/5**, harmful-error **9.1% → 4.5%**, coverage 100%, no extra model cost. `docs/artifacts/eval-baseline-corrected-2026-08-29.json`. (Calibrated + corrections: 54.5%; ROI + corrections: 63.6% — corrections dominate either base.) | **Kept — the improvement.** Unchanged conclusion from the old set: the vision model cannot tell a hard-error display from a running cycle, and one durable fact per broken unit clears it in every camera at no model cost. Now also halves the harmful-error rate. Remaining error is `free`→`occupied` over-calls, which are time-varying and out of scope for durable corrections. |
| Iteration 3 (2026-08-30) — correction → `promptFragment` feedback loop | **Close the loop (D-0014 steps 1–3).** `npm run synthesize` reads each correction + the model's own wrong rationale from the baseline report and asks a model to write a short per-machine **reading rule** (a visual cue, not a state assertion); the rule is stored as that machine's `promptFragment` in `data/machines.json`. `npm run eval -- --mode=roi --fragments` appends each rule to that machine's ROI call. The 3 `out_of_order` corrections → 3 fragments. | **ROI + fragments: 63.6%** (all 3 loop samples — 63.6/59.1/63.6% — clear the baseline's 45.5%; `eval-roi-fragments-samples-2026-08-30.md`), `out_of_order` recall **0/5 → 3/5** (stable across samples), harmful-error 4.5% (noisy: one sample 18.2%), coverage 81.8%, 16 calls, ~$0.023. `docs/artifacts/eval-roi-fragments-2026-08-30.json`, caches `data/cache/{synthesis,roi-fragments}/`. **+18.2 pp** = one committed loop sample vs one baseline sample (the baseline was not re-sampled — magnitude is single-vs-single, robustness is 3/3 loop runs above baseline). `--fragments --corrections` → **72.7%** / oo 5/5. | **Kept — the first automated config to clear the baseline on this set.** 5 cells fixed vs plain ROI, 0 broken: 1 in-sample (`W-04`), 2 the **same broken unit showing the same cue on a frame the rule was not derived from** (`D-02`@img_1822, `D-06`@img_1823, rules from img_1821 — cue-consistency, not open-ended generalisation), 2 genuine **cross-machine spillover** (`D-01`, `D-05` have no fragment; a neighbour's rule in the shared stacked-panel prompt fixed them). Excluding the in-sample cell, 13/22 = 59.1%, still +13.6 pp over baseline. **Limits:** all 5 frames are one capture session, so "held-out" is spatial not temporal — a re-shoot at a different time is the real test and the remaining step; n=22, one committed loop sample (2 author-attested re-runs); all 3 corrections are `out_of_order`, so the rules are broken-machine cues, not a `free`↔`occupied` reading-rule test. |

## Recalibrated evaluation (2026-08-29)

The eval was rebuilt around the D-0015 calibration model. **What changed:** the frame set
went from 9 unscoped stills to **5 stills, one per calibrated camera** (`C-01…C-05`), each
re-retouched by the author and each scoped — via `data/site-config.json` — to the machines
that camera is responsible for. The 4 close-up frames no camera covered were dropped. Two
new modes: `--mode=calibrated` (annotated shot + mask as extra images) and `--mode=roi`
(per-machine crops from a colour-coded region map — `src/agent/roi.ts`, `src/eval/mask-
regions.ts`).

**Why the old numbers do not carry over:** different frames, different (author-redrawn)
redactions, and per-camera scoping change the observation set entirely (45 determinate → 22).
The 2026-08-28 reports and the 62.2 / 57.8 / 75.6 / 80.0 figures are **retired**; the
Progression rows above them are kept as history.

**One recorded sample per config** (`claude-haiku-4-5`), n = 22 — small. Re-runs of the ROI
config held accuracy at 40.9% but moved harmful-error 4.5–13.6% and coverage 82–86%
(`docs/artifacts/eval-roi-samples-2026-08-29.md`); read few-point gaps with that in mind. All
score the same 22 determinate observations on the same 5 committed frames; all
`--replay`-reproducible from `data/cache/` byte-for-byte.

| Metric | Baseline | Calibrated | ROI | ROI + **fragments** | **Baseline + corr.** | ROI + frag. + corr. |
| --- | --- | --- | --- | --- | --- | --- |
| Per-machine accuracy (determinate GT, n=22) | 45.5% | 31.8% | 40.9% | **63.6%** | **68.2%** | **72.7%** |
| Harmful-error rate | 9.1% | 0.0% | 9.1% | 4.5%¹ | **4.5%** | 4.5% |
| Coverage | 100% | 100% | 86.4% | 81.8% | 100% | 86.4% |
| Accuracy on covered | 45.5% | 31.8% | 47.4% | 77.8% | **68.2%** | 84.2% |
| `out_of_order` recall | 0/5 | 0/5 | 0/5 | 3/5 | **5/5** | 5/5 |
| Model cost per frame | ~$0.003 | ~$0.007 | ~$0.004 | ~$0.005 | ~$0.003 | ~$0.005 |

¹ noisy — 3 live samples of the frozen fragments scored harmful-error 4.5 / 18.2 / 4.5 %
(accuracy 63.6 / 59.1 / 63.6 %, `out_of_order` 3/5 all three). See
`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`.

**ROI + fragments** is the **feedback loop** (D-0014, Iteration 3): the 3 integrator
corrections are synthesised into per-machine `promptFragment` reading-rules, which the ROI
agent then consumes. **The first automated configuration to clear the baseline on this set**
— all 3 loop samples (63.6 / 59.1 / 63.6 %) beat the baseline's 45.5 %. The **+18.2 pp** is
one committed loop sample vs one baseline sample (the baseline was not re-sampled): read the
magnitude as single-vs-single, the robustness as 3/3 loop runs above baseline. Of its 5
fixes over plain ROI: 1 in-sample, 2 the same broken unit showing the same cue on a frame
the rule was not derived from (`D-02`, `D-06` — cue-consistency), 2 genuine cross-machine
spillover in a shared crop (`D-01`, `D-05`). All 5 frames are one capture session, so a
*temporal* re-shoot is the real test and the remaining step. The override (`Baseline +
corr.`) still scores higher *on the corrected cells themselves* (it is ground truth there)
but does not generalise; combining both gives 72.7 %.

**Calibrated** (annotated shot + mask as vision inputs) is a **documented dead-end**: −13.7 pp
vs baseline, the model reads state off the annotation layer, and the mask image collapses it
onto `occupied` (`free` recall 0/10 — hence the misleading 0% harmful).

**ROI** (per-machine crops from the colour-coded region map) is the **architecturally-right
approach with a small measured shortfall**: id follows the painted colour, so a camera at an
angle or a non-standard stack is handled without any positional guessing — but the frozen
config scores **40.9% across 3 samples, ~4.6 pp below the baseline**. It clearly helps on the
front-on camera and on `free` precision; `claude-haiku-4-5` just cannot read the small worn
7-segment displays in the wide angled shots (C-02: 1/7, C-03: 0/2). Three prompt variants
(vague up/down; explicit left/right; + worn-segment) scored 40.9 / 50.0 / 54.5% — the higher
numbers from vaguer prompts that also raised harmful-error to 13.6%. The committed config is
the "left/right" variant (which re-ran to 40.9% here); the worn-segment caveat was kept out
(disclosed — it is `out_of_order` guidance, which the corrections layer owns).

Both are kept in-tree (`--mode=calibrated` / `--mode=roi`, caches committed) so the results
reproduce. **Baseline + integrator corrections** remains the improvement: +22.7 pp,
`out_of_order` 0/5 → 5/5, harmful-error halved (and it dominates either alternative base —
ROI + corrections is 63.6%).

### Historical — Baseline → Iteration 1 → Iteration 2 (9-frame set, retired 2026-08-29)

**One sample per mode** (`claude-haiku-4-5`). Scored 45 determinate observations on 9
committed frames; superseded by the recalibrated set above. The four reports are kept under
`docs/artifacts/historical/`; the matching `data/cache/{baseline,agent}/` from that run were
removed in the recut and are recoverable from git history before 2026-08-29 (the reports
carry the full per-frame predictions, so they stand as the evidence without the cache).

| Metric | Baseline | Iter 1 (verify) | Iter 2 (verify + corr.) | Final: classify + corr. |
| --- | --- | --- | --- | --- |
| Per-machine accuracy (determinate GT, n=45) | 62.2% | 57.8% | 75.6% | 80.0% |
| Harmful-error rate | 2.2% | 0.0% | 0.0% | 0.0% |
| Coverage | 95.6% | 100% | 100% | 95.6% |
| Accuracy on covered | 65.1% | 57.8% | 75.6% | 83.7% |
| `out_of_order` recall | 0/8 | 0/8 | 8/8 | 8/8 |
| Model cost per frame | ~$0.004 | ~$0.006 | ~$0.006 | ~$0.004 |

On this set, **Iteration 1 (verification pass)** was net-negative (−4.4 pp, over-commits
`free`→`occupied`) and **Iteration 2 (integrator corrections)** was the improvement, taking
the classify-only config to 80.0% / `out_of_order` 8/8. Both conclusions held on the
recalibrated set — the verify pass is still config-gated off (`agent.verification.enabled`),
the corrections are still the win — so the 2026-08-29 numbers above are the ones to cite.

## Main contribution, failure mode, and hot take

**Main contribution.** Two things. (1) The **evaluation frame** that made two plausible-looking
agent steps — a verification pass, and image-based per-camera calibration — show up as
regressions instead of shipping: `unknown` + `out_of_order` as first-class states,
`harmful`-error scored separately (D-0006), a fair baseline told the same machine list
(D-0012), key-free `--replay`. (2) The **correction feedback loop** (D-0014): an integrator
records 3 durable "out of service" facts, `npm run synthesize` turns each into a per-machine
reading-rule, and the ROI agent consumes them — **63.6%** (`--mode=roi --fragments`), the
first automated configuration to clear the baseline (45.5%) on this set, with 4 of 5 gains on
cells the rules were not derived from (2 same-unit / same-cue, 2 cross-machine spillover).
The override alone (`--corrections`) is higher on the corrected cells (68.2%,
it is ground truth there) but does not generalise; the loop turns one human correction into a
rule the model applies itself on frames it has not seen. The agentic win: *a human overrules
a specific failure once, and that correction improves how the model reads that machine — and
its neighbours — from then on.*

**Main failure mode.** The model reads the price panel, not the cycle. `claude-haiku-4-5`
treats the always-lit `2.25` price display as an active countdown, so it over-calls `free` as
`occupied` (6/10), and it reads a hard-error display (`E rot`) as a running cycle, so
`out_of_order` recall is 0/5. Handing it the D-0015 calibration images made this *worse*: it
reads state off the flat-colour annotation, and the mostly-black mask image pushes it to
answer `occupied` for everything (`free` recall 0/10). Two models, four prompt phrasings —
none beat the plain whole-frame call.

**Hot take.** The highest-leverage work here was not any agent change — it was building the
metric before building the agent, and being willing to log a negative result. A verification
pass and then a richer calibrated input both *looked* like progress; separate `harmful` /
coverage / `out_of_order` scoring is what showed each was a regression on the model we'd
actually ship, instead of a demo we'd celebrate. And the agentic design that finally worked
was not a cleverer one-shot prompt — it was the **loop**: a human overrules a specific
failure once, that correction is synthesised into a durable reading-rule, and the model then
applies it on frames it never saw (4 of 5 gains held-out, including cases where a rule for one
machine fixed an un-corrected neighbour). Decide what each error costs the user, encode it in
the metric, and let a human correction *teach the model a rule*, not just patch one cell.

## Verification runs

Record the result of each infra verification here (append, newest first).

### 2026-08-30 — feedback loop wired end-to-end in the portal (+ `synthesize --replay` fix)

- **`POST /api/corrections`**: a `machine`-scope correction now runs `synthesizeForCorrection`
  (shared helper, `src/eval/prompt-synthesis.ts`) when `ANTHROPIC_API_KEY` is set —
  synthesises the reading-rule, writes it to `data/machines.json`, returns
  `synthesized: {machineId, fragment, source}`. Key-free: skipped, response says so. A
  synthesis failure never fails the correction write.
- **`/api/refresh`**: loads the roster and folds every `promptFragment` into `baselinePrompt`
  + the live cache key. Fresh deployment (no fragments) = identical to before. The eval's
  `runBaseline` / `--mode=baseline` still gets no fragments — the fair A/B is untouched.
- **`baselinePrompt(machineIds, fragments?)`**: optional 2nd arg; `runBaseline` never passes
  it, so `--mode=baseline --replay` reproduces 45.5 % byte-for-byte.
- **Bug fixed:** `npm run synthesize -- --replay` never worked in the first Iteration-3
  commit — once the fragments were committed to `data/machines.json`, a re-run saw them as
  "existing" and built a *merge* prompt → different hash → cache miss. `synthesizeForCorrection`
  now merges only into a **human-written** fragment; a prior `synthesis` / `merged` output is
  regenerated from scratch. `npm run synthesize -- --replay` is now idempotent and reproduces
  `data/machines.json` exactly. The earlier commit's "reproduces via `--replay`" claim for the
  synthesis step was wrong; it is now true.
- Verified: dev server — `POST /api/corrections` (`D-02`, key present) returns the D-02
  fragment, `source: "synthesis"` (not "merged" — ignores its own prior output);
  `POST /api/refresh` runs fragment-aware. `typecheck` / `lint` / `format:check` / `build` /
  `check:data` pass; `npm test` **96/96** (+7: `synthesizeForCorrection`, `baselinePrompt`).
  `--replay`: baseline 45.5 %, roi 40.9 %, roi+fragments 63.6 %, +corrections 72.7 % —
  unchanged. `npm run synthesize -- --replay` → the 3 committed fragments, no file change.
- **Verdict:** kept. The loop is now operable from the portal exactly as D-0014 describes; the
  measured number still comes only from the offline `--replay` chain. Remaining step is
  unchanged — a temporal / held-out capture set.

### 2026-08-30 — correction → `promptFragment` feedback loop (D-0014 steps 1–3)

- **Synthesis** (`src/eval/prompt-synthesis.ts`, `npm run synthesize`): for each corrected
  cell where the baseline was wrong, one vision call takes the model's own wrong rationale +
  the correction + the source frame → a short per-machine reading-rule. Guard `--live |
  --replay | --fake`; cache `data/cache/synthesis/` (3 files). The 3 `machine`-scope
  corrections (`W-04`, `D-02`, `D-06`) → 3 fragments written to `data/machines.json` with
  `fragmentSource: "synthesis"`. `$0.0065` live.
- **Consumption**: `runRoi` gained a `fragments: Record<id,string>` param; `run-eval` gained
  `--fragments` (ROI only) — builds the map from the roster, writes a separate cache
  (`data/cache/roi-fragments/`, 16 files) and report so the plain `--mode=roi` artifacts are
  byte-identical. `baselinePrompt` / `--mode=baseline` untouched (fair baseline stays clean).
- **`--live` (haiku, 16 calls, ~$0.023):** ROI + fragments **63.6%** / harmful 4.5% /
  coverage 81.8% / `out_of_order` **3/5**; `--fragments --corrections` → **72.7%** / oo 5/5.
  Re-ran the frozen fragments `--live` twice more: 59.1% / 63.6% accuracy, oo 3/5 both,
  harmful 18.2% / 4.5% (`docs/artifacts/eval-roi-fragments-samples-2026-08-30.md`). Reports
  `eval-roi-fragments{,-corrected}-2026-08-30.json`; `--replay --fragments` reproduces the
  committed sample byte-for-byte.
- **Per-cell** (committed sample vs plain ROI): 5 fixed, 0 broken — 1 in-sample (`W-04`),
  2 the same broken unit / same cue on a frame the rule was not derived from
  (`D-02`@img_1822, `D-06`@img_1823 — cue-consistency), 2 genuine cross-machine spillover
  (`D-01`, `D-05`, no fragment of their own). Excluding the in-sample cell: 13/22 = 59.1%.
- `typecheck` / `lint` / `format:check` / `check:data` / `build` — pass; `npm test` — **89/89**
  (`prompt-synthesis.test.ts` +6, `roi.test.ts` +1). `--replay` of baseline (45.5%), roi
  (40.9%), baseline+corrections (68.2%) unchanged.
- **Verdict:** kept — Iteration 3, the first automated configuration to clear the baseline on
  this set (all 3 loop samples above 45.5%; the +18.2 pp magnitude is single-vs-single). The
  loop is built and measured on the transfer signal the 5 frozen frames allow; a full number
  needs a temporal / held-out capture set (the remaining step). See `docs/DECISIONS.md`
  D-0014.

### 2026-08-29 — ROI mode: per-machine crops from a colour-coded region map

- **Region map:** `camera.mask` is now a PNG where each machine's body/panel is painted one
  solid colour; `camera.maskLegend` (`data/site-config.json`) is `hex → machineId`, one per
  machine. The author drew all 5 (`img_*.mask.png`, replacing the earlier transparent masks).
  `src/eval/mask-regions.ts` reads it — nearest-legend-colour per pixel (tolerates
  resize / anti-alias drift), unions same-colour pixels, one bbox per machine; `groupRegions`
  merges a **vertical** x-overlapping pair into one stacked-panel crop and keeps a
  perspective-diagonal row as separate crops.
- **`--mode=roi`** (`src/agent/roi.ts`, `runRoi`): crop the live frame to each group's region
  (via `sharp`, `--live` only), one classify call per group; a stacked pair is told which
  readout is the upper unit's (left, up-arrow) and which the lower's (right, down-arrow). The
  cache is keyed by the crop bbox, not image bytes, so `--replay` reproduces without cropping
  — `sharp` (now an explicit `devDependency`, pinned to the `^0.35.3` `next` expects) derives
  bboxes on replay.
- **`--live` (haiku, 16 calls, ~$0.02):** accuracy **40.9%** / harmful 9.1% / coverage 86.4%
  / `out_of_order` 0/5; `--replay --corrections` → **63.6%** / harmful 4.5%. The frozen config
  re-ran to **40.9% accuracy on all 3 samples** (harmful 4.5–13.6%, coverage 82–86%) —
  ~4.6 pp below the baseline's single 45.5% (`eval-roi-samples-2026-08-29.md`). Per camera:
  C-01 3/4, C-04 3/6, C-05 2/3, C-03 0/2, C-02 1/7 (the wide angled shots defeat haiku's
  small-display OCR). Reports `docs/artifacts/eval-roi{,-corrected}-2026-08-29.json`, cache
  `data/cache/roi/` (force-added); both reproduce byte-for-byte.
- Also tried three prompt variants (vague up/down; explicit left/right; + worn-segment
  guidance) — 40.9 / 50.0 / 54.5%, harmful 4.5–13.6%; the higher numbers came from vaguer
  prompts guessing more. Froze the left/right variant; kept the worn-segment caveat OUT (it
  shifted free/occupied the wrong
  way here, and `out_of_order` is the corrections layer's job, not ROI's) — a disclosed call.
- `src/eval/site-config.ts` `Camera` gains `maskLegend?`; `src/eval/types.ts` `meta.mode`
  gains `"roi"`; `run-eval.ts` gains `--mode=roi`. Tests: `mask-regions.test.ts` (6),
  `roi.test.ts` (2) — **82/82**. `typecheck` / `lint` / `format:check` / `check:data` /
  `build` pass.
- **Verdict:** kept as an iteration — the right architecture (layout-independent per-machine
  crops), not a measured win on this set. The improvement path stays integrator corrections.

### 2026-08-29 — recalibrated eval: 5 camera-scoped frames; calibration images = dead-end; new baseline

- **Dataset:** 9 unscoped frames → 5 stills, one per camera `C-01…C-05`, each re-retouched by
  the author, each with a `camera` field in its label + a scoped `machineIds` list + an
  annotated shot + an analysis mask in `data/site-config.json`. Dropped `img_1824/1825/1826/
  8629` (close-ups no camera covered) and their labels; `data/splits/evaluation.txt` → 5.
- **New code:** `--mode=calibrated` (`src/agent/calibrated.ts`, `runCalibrated` — one call +
  annotated + mask via `cameraClassifyPrompt`); `src/eval/calibration.ts` `cameraForFrame`;
  `scoreAll(…, scope)` restricts scoring to the camera's machines; `run-eval.ts` resolves
  the camera per frame and scopes baseline + calibrated identically. `AnthropicVisionClient`
  `max_tokens` 1500 → 4000 (1500 truncated sonnet mid-JSON on the larger banks, losing whole
  frames to parse errors). `laundry3.config.ts` `visionModel` stays `claude-haiku-4-5`.
- **`--live` runs** (`claude-haiku-4-5`, 5 calls each): baseline **45.5%** / harmful 9.1% /
  cov 100% / oo 0/5; calibrated **31.8%** / harmful 0.0% / cov 100% / oo 0/5. `--replay
  --corrections`: baseline+corr **68.2%** / harmful 4.5% / oo **5/5**; calibrated+corr 54.5%.
  Also tried calibrated on `claude-sonnet-5` (31.8%) and four prompt phrasings (27–36%) —
  none beat baseline. ~$0.7 total API across the iteration.
- Reports `docs/artifacts/eval-{baseline,baseline-corrected,calibrated,calibrated-corrected}
  -2026-08-29.json`; caches `data/cache/{baseline,calibrated}/` (5 each, force-added). All
  four reports reproduce byte-for-byte from `--replay`. Removed the 2026-08-28 reports +
  `data/cache/agent/`.
- `typecheck` / `lint` / `format:check` — pass; `npm test` — **75/75** (`calibrated.test.ts`,
  `calibration.test.ts` added); `check:data` — pass; `npm run build` — pass.
- **Verdict:** calibration-via-images is a documented dead-end (kept in-tree for
  reproducibility); the integrator-correction result carries over and is the improvement.

### 2026-08-29 — `/api/refresh` camera-aware prompt (fragments + annotated + mask); eval unchanged

> **Reverted 2026-08-29 (later).** Once `--mode=calibrated` was measured as a −13.7 pp
> dead-end and `camera.mask` was repainted as a colour region map, feeding those to the live
> model made no sense. `POST /api/refresh` is back to one `baselinePrompt` whole-frame call
> per camera, matching the shipped "baseline + corrections" config. `cameraClassifyPrompt`
> remains, used only by the eval's `--mode=calibrated`. (Same fix repointed
> `buildRoomStatus`'s default report to `eval-baseline-2026-08-29.json` — the portal 500'd
> when the 2026-08-28 report moved to `historical/`.)

- New portal-only `cameraClassifyPrompt` (`src/agent/camera-classify.ts`) replaces
  `baselinePrompt` in `POST /api/refresh`. Folds in roster `promptFragment` hints and, when a
  camera has them, its `annotatedShot` + `mask` as extra reference images (`VisionRequest.
  extraImagePaths`). Mask is passed as image + instruction, not composited (no `sharp`).
- The eval's `baselinePrompt` / `classifyPrompt` / `runAgent` / `runBaseline` are untouched.
  `requestHash` only changes when `extraImagePaths` is non-empty → committed caches stable.
- **No metric moved.** `npm run eval -- --mode=agent --replay` → 57.8% / harmful 0.0% /
  coverage 100% / 14 calls / $0.0506; `--mode=baseline --replay` → 62.2% / 2.2% / 95.6% / 9
  calls / $0.0351 — both byte-for-byte identical to the committed artifacts. No seeded camera
  carries a fragment/annotated/mask, so `/api/refresh` accuracy is **unmeasured** by design.
- `typecheck` / `lint` / `format:check` pass; `npm test` 70/70; `check:data` pass;
  `npm run build` pass.
- **Scope:** this commit is the plumbing only. Authoring the calibration assets it consumes
  (annotated shots + masks per camera, per-machine `promptFragment`s) and a measured
  `--live` pass over `/api/refresh` to quantify the effect are **future work** — tracked, not
  claimed here. As submitted the path degrades to the baseline wording on every real call.

### 2026-08-29 — reservations on by default; per-tenant limit 2, enforced client + server

- `laundry3.config.ts`: `reservation.enabled` `false → true`, `maxActivePerUser` `1 → 2`
  (owner decision). `src/config/defaults.ts` unchanged — a bare deployment stays read-only.
- Tenant UI no longer hard-blocks a second hold: `machine-card.tsx` counts the tenant's
  active holds against `machines.reservationLimit` (new field, hydrated from
  `reservation.maxActivePerUser`), matching the server guard in `POST /api/reservations`.
- No metric moved — reservations are portal-only, never read by `src/agent/*` / `src/eval/*`.
  `typecheck` / `lint` / `format:check` pass; `npm test` 64/64; `check:data` pass;
  `npm run build` pass. D-0007 amendment records the supersession of "one at a time".

### 2026-08-29 — fix: agent `--replay` restored (path collision on `data/site-config.json`)

- `npm run eval -- --mode=agent --split=evaluation --replay` had thrown since `d4da68e`
  (the portal camera list at `config.paths.siteConfig` isn't the eval's calibration shape).
  `src/agent/pipeline.ts` `loadSiteConfig` now returns `null` unless the file has a
  `machines[]` array — the state the recorded cache was made in. Guarded by
  `src/agent/pipeline.test.ts` (3 new cases).
- **Re-verified against the committed artifacts:** agent replay →
  57.8% / harmful 0.0% / coverage 100% / 14 calls / $0.0506; `--replay --corrections` →
  75.6% / `out_of_order` 8/8. Both match this file's Progression rows. Baseline replay
  (62.2%) unchanged. `typecheck` / `lint` / `format:check` pass; `npm test` 64/64;
  `check:data` pass.

### 2026-08-29 — configuration: surface overrides-file vs laundry3.config.ts

- `GET/PATCH /api/config` add `base` + `fromFile` (paths changed from `laundry3.config.ts`,
  i.e. only in the git-ignored overrides file). `overrides.ts` exports `diffPaths`,
  `baseConfig`, `overrideFilePaths`. `ConfigView`: amber `•` = "not yet in
  `laundry3.config.ts`" (mint `•` stays "differs from default"); a banner + "show
  laundry3.config.ts snippet" button emits a `defineConfig({…})` literal for those fields.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **61/61**;
  `check:data` — **pass**. Curl + Chrome verified (`fromFile` = exactly the PATCHed fields;
  snippet matches). Screenshot regenerated.

### 2026-08-29 — reservations: reworked mechanic

- A held machine now reads `occupied` to everyone (`buildRoomStatus` flips the state);
  owner-only "your reservation · until HH:MM" badge. `DELETE /api/reservations` removed (no
  cancel); `POST` rejects a 2nd hold by the same `by` up front. `machine-card.tsx`: reserve
  affordance only on a truly-free card and only while I hold nothing (`iHaveAHold`); cancel
  UI gone.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **61/61**;
  `check:data` — **pass**. Curl: reserve → occupied; same-`by` 2nd → 409; other `by` → ok;
  `DELETE` → 405. D-0007 amendment + README updated.

### 2026-08-29 — live status: tenant machine reservations

- New `src/portal/reservations.ts` + `src/portal/client-id.ts`; `POST/DELETE/GET
  /api/reservations` (enable / free / per-user / fraction guards, all server-side);
  `buildRoomStatus` overlays `reserved`/`reservedUntil`/`reservedBy`; `/tenant` →
  `force-dynamic`. New `ConfirmDialog` (Radix `AlertDialog`); `MachineCard` tenant view =
  reserve / release via the dialog, amber `RESERVED` badge, held machines excluded from the
  "free" headline. `data/reservations.json` git-ignored; not read by the eval. D-0007
  amendment.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **61/61** (+5);
  `check:data` — **pass**. Route table adds `ƒ /api/reservations`. Curl round-trip verified
  (403 disabled → reserve → per-user 409 → release).

### 2026-08-29 — configuration: preset controls, machine-count locked, `videoFps` dropped

- `site.machines.*` read-only (`LOCKED_PREFIXES` += `"site.machines."`; `stripLocked` fixed
  for nested keys). `site.timezone` → `UTC±HH:00` offset select (`Etc/GMT` mapping).
  `agent.visionModel` and `frames.maxStill/VideoPx` → preset `<Select>`s. `frames.videoFps`
  removed from the config schema (dataset-prep detail; `prepare-dataset.ts` defaults `--fps`
  to 1).
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **56/56**
  (−1: `videoFps` validator test removed); `check:data` — **pass**. Screenshot regenerated.

### 2026-08-29 — settings: editable "Configuration" section

- New `src/config/overrides.ts` (`resolvePortalConfig` / `writeOverrides` /
  `overriddenPaths`); `deepMerge` exported from `load.ts`. `PATCH /api/config` validates
  and persists to git-ignored `data/config-overrides.json` — a portal-runtime layer the
  offline eval does not read. `ConfigView` rewritten as a form (text / number / switch /
  select; `paths.*` read-only; amber dirty highlight; `save` / `cancel`).
  `integrator/page.tsx` reads `resolvePortalConfig()`. `paths.*` stripped server-side in
  `writeOverrides`; `deepMerge` skips `__proto__`/`constructor`/`prototype`. D-0008
  amendment.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **57/57** (+6:
  `overrides.test.ts`, `deepMerge` proto guard); `check:data` — **pass**. Curl: PATCH
  persists, GET reflects it, invalid merge → 400, `data/config-overrides.json` written +
  git-ignored. Screenshot regenerated.

### 2026-08-29 — settings: read-only "Configuration" section

- New `GET /api/config` (resolved config + `overridden` dotted-path list) and `ConfigView`
  — a "Configuration" collapsible on `/integrator/settings` showing every deployment knob
  grouped, monospace, with a `•` on overridden values. Read-only (same values feed the
  offline eval; edited in `laundry3.config.ts`). D-0008 amendment.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. Route table adds `ƒ /api/config`. Screenshot regenerated.

### 2026-08-29 — portal: button-label consistency + no dev ids in UI copy

- Mark-wrong panel (`machine-card.tsx`): instant-submit state buttons → state selection +
  `save` + icon `cancel`.
- `cameras-editor.tsx`: per-image `remove` → icon-only; delete-camera → icon + "remove";
  image labels + intro reworded (no `D-00xx` / `StaticImageFrameSource`).
- `machines-editor.tsx`: delete → icon + "remove". `integrator-view.tsx`: dropped `(D-0014)`
  from the info box.
- Presentational only. `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **51/51**; `check:data` — **pass**. Screenshots regenerated. Backlog cleared.

### 2026-08-28 — portal: seeded cameras, mask/preview/delete, unified lists, tenant labels

- New shared `DisclosureButton` (`ui/collapsible.tsx`) + `CountRow` (`ui/count-row.tsx`).
  `Section` and `MachineGrid` both render `DisclosureButton` → Settings sections now look
  identical to the Live status / Integrator machine grids; `Section` lost its card chrome.
  Live status + Integrator both render `CountRow` (coloured dots).
- Live status card: two big free-count figures + `CountRow`; `Available now:` list removed.
- `data/site-config.json` seeded with 5 cameras (`C-01…C-05`), each `stubImage` a committed
  eval frame; `Cameras (5)`. `MAX_AUTO` 60→20. `data/site-config.json` added to
  `.prettierignore` (machine-written by `writeSiteConfig`).
- `Camera.mask?` added (`site-config.ts`, `/api/cameras`, `/api/upload` `camera-mask` kind);
  stored, not yet applied at runtime. `site-config.test.ts` +mask assertions.
- New `GET /api/asset?path=` (traversal-checked, allow-listed, magic-byte-sniffed) powers
  camera image thumbnails. `ImageField` → thumbnail + `replace` + `remove` (clears the
  reference only). Stub/annotated/mask in a 3-col grid.
- `type` field removed from the machine editor rows (rows are type-fixed by section).
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. `/api/asset` curl: serves a committed frame (200 image/jpeg),
  rejects `../` and out-of-root (400). Route table adds `ƒ /api/asset`. Screenshots
  regenerated.

### 2026-08-28 — portal: collapsible lists everywhere, tenant summary, editor rows, icons

- `MachineGrid` gains a `collapsible` prop + always shows the item count in the heading
  (`Washers (16)`); disclosure `<button>` with `aria-expanded`/`aria-controls`, grid stays
  mounted behind `hidden`. Enabled on `/integrator` and `/tenant`.
- Tenant status card (`room-view.tsx`) leads with `Washers free N / 16` + `Dryers free
  N / 16` (mint when > 0, muted at 0); `in use · out of order · unknown` demoted to a
  single small line; `Available now:` id list kept.
- Settings: "Machines (32)" split into collapsible `Washers (16)` + `Dryers (16)`
  (`RosterSection`, type-fixed add row); "Site overview" made collapsible. Four collapsible
  sections, all closed by default.
- Editor cards restructured — fields → text field → a dedicated `save` + delete action row
  (was `ml-auto` that wrapped to an orphaned second line on narrow screens). `Button` base
  `min-h-9`→`min-h-10` (40 px); new `ICON_BUTTON` export (40×40); delete glyph 14→24 px;
  inline glyphs 14→16; `Section` chevron 16→18, toggle `min-h-10`. Supersedes the prior
  "~36px" target bar — D-0001 amendment.
- Camera-id placeholders `cam-1`→`C-01` + a convention note (matches `W-`/`D-`); not
  enforced (`SITE_ID_RE` unchanged).
- Presentational only. `typecheck` / `lint` / `build` / `format:check` — **pass**;
  `npm test` — **51/51**; `check:data` — **pass**. Chrome: collapse toggles verified, no
  page overflow. `docs/assets/portal-{top,machines,settings}.jpg` regenerated.

### 2026-08-28 — portal: visual-rhythm + WCAG 2.2 pass (`web-design-guidelines` skill)

- Ran the connected `web-design-guidelines` skill (Vercel Web Interface Guidelines) over
  `src/components/**` + `globals.css`; fixed every finding. Target size: AA + headroom
  (36px), agreed with owner.
- Rhythm: one spacing scale applied uniformly (`p-4` panels / `p-3` rows, `space-y-6` body,
  `gap-2/3/4`, icons `14`/`16`, text collapsed to `text-xs`/`text-sm` + new `--text-2xs`).
- a11y: `Button` `min-h-9` + shared `buttonClasses()`; `Switch` 36px hit area + required
  `label`→`aria-label`; new `LinkButton` kills `<a><button>` nesting; `aria-hidden` on
  decorative icons; `Section` `aria-expanded`/`aria-controls`; `AppShell` skip-link +
  `aria-label` navs + safe-area; `prefers-reduced-motion` block; `theme-color`; `role="alert"`
  on errors; `autocomplete="off"`/`spellCheck={false}` on code inputs; `tabular-nums` counts.
- No business-logic / API / data-model change; one render change — the collapsible
  `Section` now always mounts its body behind `hidden` (needed for `aria-controls`), so
  collapsed `MachineRow` / `CameraRow` subtrees mount.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. Route table unchanged. Screenshots regenerated.
- a11y spot-check (Chrome DevTools console, `/tenant`):

  ```js
  ({
    skipLink: document.querySelector('a[href="#main"]')?.textContent.trim(),
    mainHasId: !!document.getElementById("main"),
    navLabels: [...document.querySelectorAll("nav")].map((n) => n.getAttribute("aria-label")),
    reducedMotion: [...document.styleSheets].some((ss) => {
      try {
        return [...ss.cssRules].some((r) => r.conditionText?.includes("prefers-reduced-motion"));
      } catch {
        return false;
      }
    }),
  });
  // → { skipLink: "Skip to content", mainHasId: true,
  //     navLabels: ["Primary", "Primary"], reducedMotion: true }
  ```

### 2026-08-28 — portal: "Lumina Wash" design system (`docs/design-reference/`)

- Owner-supplied reference (`docs/design-reference/lumina_wash/DESIGN.md` + screens)
  implemented: `globals.css` full token set as Tailwind v4 `@theme` vars, single dark
  theme, `Inter` via `next/font`, `.dot-*`/`.card-*`/`.glow-*` status helpers. Removed
  `html { font-size: 150% }` (reference defines its own px scale). D-0001 amendment.
- New `src/components/ui/app-shell.tsx` — left rail (`md+`) / bottom bar (mobile), 3 items
  → the 3 URL routes. `Button` / `field` / `switch` / `Section` / `PageShell` /
  `MachineCard` / grids restyled to tokens.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. Chrome @ 486 px CSS viewport, all 3 pages + editors expanded:
  `scrollWidth == clientWidth`, 0 overflow offenders, all controls visible. Route table
  unchanged (`○ /`, `○ /tenant`, `ƒ /integrator{,/settings}`, `ƒ /api/*`).
  `docs/assets/portal-{top,machines,settings}.jpg` regenerated.

### 2026-08-28 — portal: design system + auto-refresh (radix-ui, lucide-react)

- Deps `radix-ui@1.6.7` + `lucide-react@1.35.0` (portal-only). New `src/components/ui/` kit
  (`PageShell` / `Button` / `Section` / `field` / `switch`) — all pages rebuilt on it for a
  consistent look.
- Machines editor: table → stacked cards; every control visible at a 575 px viewport, no
  page horizontal scroll.
- Auto-refresh: `RefreshControl` (manual button + Radix `Switch` at
  `runtime.stateRefreshSeconds`) → `POST /api/refresh` (captures each camera's stub feed,
  runs the agent with a key, else re-fuses).
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**;
  `check:data` — **pass**. `ƒ /api/refresh` added; `○ /tenant` still static.

### 2026-08-28 — portal: URL routes, font 150%, mobile responsiveness

- URL-based routing: `/` → `/tenant` (static), `/integrator` (console), new
  `/integrator/settings` (Machines + Cameras editors). `html` font 200% → **150%**.
- Mobile: `body { overflow-x: clip }` backstop; machines table `min-w` reduced; header
  button groups wrap. Verified at a 486 px CSS viewport — no page-level horizontal scroll on
  any route, zero real offenders.
- Screenshots regenerated; README / REPRODUCTION / DECISIONS D-0015 route names updated.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**.
  Routes: `○ /`, `○ /tenant`, `ƒ /integrator`, `ƒ /integrator/settings`, `ƒ /api/*`.

### 2026-08-28 — integrator console: Cameras CRUD + upload; layout fixes (D-0015)

- `src/eval/site-config.ts` (`data/site-config.json`; validate/sort; `parseMachineIds`;
  upsert/remove), `GET/POST/PATCH/DELETE /api/cameras`, `POST /api/upload` (multipart,
  jpeg/png/webp ≤ 4 MB → `data/site-config/<id>/`, git-ignored), `CamerasEditor`. +5 tests
  (51 total).
- Trust-boundary docstrings mirrored into `/api/machines`, `/api/cameras`, `/api/upload`.
- Layout: `max-w-[1100px]` (px, no 2×-scale overflow), `sm:grid-cols-2`, editors are
  `<details>` collapsed. Screenshots regenerated; stale settings screenshot removed.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **51/51**.
  Routes: `ƒ /api/cameras`, `ƒ /api/upload` added.

### 2026-08-28 — integrator console: Machines CRUD (D-0015)

- `src/eval/roster.ts` (typed roster + validate/sort + upsert/remove; `promptFragment` per
  machine), `POST/PATCH/DELETE /api/machines` writing `data/machines.json`,
  `MachinesEditor` table on `/integrator`. +6 tests (46 total).
- Curl round-trip (add → patch → traversal-blocked → delete) leaves `data/machines.json`
  byte-identical. `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` —
  **46/46**. Routes: `ƒ /api/machines` added.
- Next: cameras CRUD + image upload, per-machine reference screenshots.

### 2026-08-28 — portal: 2× font + split tenant / integrator pages

- `html { font-size: 200% }`; px-literal text classes → `text-xs`; `max-w-6xl`; responsive
  grid; `overflow-wrap: anywhere` + `break-words` so nothing overflows.
- `/` = tenant `RoomView` (state only, still `○`). `/integrator` = `IntegratorView`
  (`force-dynamic`) with the mark-wrong loop, refresh button, and a Site-overview section.
  Shared `MachineCard` extracted; old `room-status.tsx` component + `?role=` toggle removed.
- Routes: `○ /`, `ƒ /integrator`, `ƒ /api/corrections`, `ƒ /api/room`.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **41/41**;
  both pages checked in Chrome.
- Next: machines + cameras CRUD on `/integrator`, `data/site-config.json` schema (D-0015).

### 2026-08-28 — portal: full roster + refresh + integrator settings panel

- `buildRoomStatus` iterates the whole 32-machine roster; `D-11…D-16` (not in the mock
  photos) show as `unknown` / `seenIn 0`. +1 test (41 total).
- `GET /api/room` (`src/app/api/room/route.ts`) + a "↻ refresh recognition" button re-fuse
  the room without an API call (the D-0016 re-capture hook). "Integrator settings" panel:
  roster stats + mock-camera → machine map + the D-0015 not-built note.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **41/41**;
  `check:data` — **pass**. Build routes: `○ /`, `ƒ /api/corrections`, `ƒ /api/room`.

### 2026-08-28 — portal: integrator role + clickable correction loop

- `buildRoomStatus` overlays D-0014 corrections (default report → `eval-baseline-2026-08-28.json`
  so the overlay is visible); `MachineView.corrected` / `.correction`; +1 test (38 total).
- `writeCorrection()` extracted from the CLI into `src/eval/corrections.ts`, shared with a
  new `POST /api/corrections` route (Node runtime; `GET` summarises). Build unchanged:
  `○ /`, `ƒ /api/corrections`.
- `?role=integrator` → per-card confidence + source + "✕ mark wrong" (state picker + note +
  durable toggle → `scope: machine`); submit swaps in the API's re-fused room, card flips
  with an integrator badge. Tenant `/` = state only.
- Verified in Chrome end-to-end (3 committed corrections shown; a test mark-wrong flipped a
  card and updated counts live; test correction removed). Screenshots refreshed.
- `typecheck` / `lint` / `build` / `format:check` — **pass**; `npm test` — **38/38**;
  `check:data` — **pass**. Meets D-0016 P0 (judge walks the loop key-free).

### 2026-08-28 — cache refreshed on `claude-haiku-4-5` + committed frames

- Deleted the archived `claude-sonnet-5` cache (still in git at `e8de845`) and re-ran
  `--live` on `claude-haiku-4-5` against the committed author-redacted frames, so the cache,
  the reports, and the frames now all match. **Baseline** 62.2% acc / 2.2% harmful / 95.6%
  coverage / 0/8 `out_of_order`, $0.035, 9 calls. **Agent (verify)** 57.8% acc / 0.0%
  harmful / 100% coverage / 0/8 `out_of_order`, $0.051, 14 calls. Reports regenerated;
  `data/cache/{baseline,agent}/` re-committed.
- `AnthropicVisionClient` no longer hard-codes `output_config.effort` — new
  `agent.visionEffort` knob (`"none"` default; haiku rejects the parameter, so `"none"`
  omits it). `runtime.captureIntervalSeconds` knob added (camera screenshot cadence,
  default 15 s, ≤ `stateRefreshSeconds`). Both validated on load, +tests.
- Result write-up rewritten honestly: the verification pass is **net-negative on accuracy**
  on haiku (−4.4 pp) — kept in-tree config-gated as a studied negative result, not shipped.
  Progression / comparison / hot-take sections updated. The "known gap" from the previous
  entry is **closed** — cache and committed frames are consistent.
- **Iteration 2 — integrator corrections (D-0014).** New `src/eval/corrections.ts`
  (`observation` / `machine` scope, authoritative override), `scripts/correct.ts`
  (`npm run correct`), `--corrections` flag on `run-eval`. Recorded 3 `machine`-scope
  corrections (`W-04`, `D-02`, `D-06` = out of service). `npm run eval -- --mode=agent
  --split=evaluation --replay --corrections` → accuracy **75.6%** (+17.8 pp over Iter 1,
  +13.4 pp over baseline), **`out_of_order` 8/8**, harmful 0.0%, coverage 100%, no extra
  model cost. Report: `docs/artifacts/eval-agent-corrected-2026-08-28.json`. +5 tests.
- `npm run typecheck` / `npm run lint` / `npm run build` / `npm run format:check` — **pass**;
  `npm test` — **37/37**; `npm run check:data` — **pass**; `--replay` (± `--corrections`)
  reproduces all three runs exactly.

### 2026-08-28 — 9 eval frames committed (author-drawn redactions)

- New `scripts/derive-redactions.ts`: recovers the frame author's hand-drawn black
  redaction boxes from `data/raw/_reference/*.jpg` (connected-component analysis) and writes
  `data/raw/redactions.json` as `mode:"fill"` rectangles in produced-frame pixel space.
- `npx tsx scripts/derive-redactions.ts` → 9 sources, 3–12 boxes each;
  `npm run dataset:prepare -- --force` → 45 frames, `npm run check:data` **pass**.
- Visually verified all 9 committed stills box-by-box against reference + label file:
  décor-free identifying content covered (vendor sticker/phone, windows, wall TV); every
  **determinate** machine's status display still legible; no colored annotation leaked in.
- `.gitignore` now allows the 9 labelled eval stills by name; committed under
  `data/public/frames/`. Video-derived + unlabelled frames stay local.
- Compliance subagent: **PASS (with risks)**, no blockers —
  `docs/trajectories/compliance/2026-08-28-commit-eval-frames.md`. Risk fixes applied:
  inline caveat on the EVALUATION Results header; publish-authorization clause restored in
  D-0009; cache-refresh tracked as an open item.
- Integrator-feedback follow-ups (same change set):
  - per-camera **raster mask** redaction (`data/raw/masks/<source>.png`) in
    `prepare-dataset.ts` — paint once per fixed camera, opaque → gray patch; supersedes
    rectangles. Rectangle path unchanged (9 frame hashes identical).
  - frame resolution is now a **config knob** — `frames.{maxStillPx,maxVideoPx,videoFps}` in
    `laundry3.config.ts`, validated on load; both scripts read it as defaults.
    `frames.maxStillPx` is the shared resolution for pipeline + mask + runtime.
- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**; `npm test` — **30/30**.
- **Known gap:** committed replay cache + recorded results predate these heavier boxes.
  `--replay` reproduces the recorded numbers exactly (image-independent hash); a fresh
  `--live` on the committed frames will differ slightly. Cache refresh pending (budget-gated).

### 2026-08-28 — infra bootstrap

- `npm run typecheck` — **pass**, no errors.
- `npm run lint` — **pass** after one fix: `react-hooks/refs` flagged reading
  `storeRef.current` during render in `store-provider.tsx`; switched the lazy store init
  from `useRef` to `useState(() => initRootStore(...))` (stable instance, no re-renders).
- `npm run format:check` — **pass** (`prettier --check .`).
- `npm run build` — **pass**, Next.js 16.3.3 (Turbopack), routes `/` and `/_not-found`
  prerendered as static content. Wall time ~5 s.
- Raw logs: `docs/artifacts/verification-2026-08-28.txt`, `docs/artifacts/build-2026-08-28.txt`.
- `node .claude/hooks/git-guard.test.mjs` — **8/8 pass** (branch-protection hook).
- Hackathon-compliance review (independent agent): **PASS WITH RISKS**, no blockers; risks
  addressed in the 2026-08-28 worklog entry.

### 2026-08-28 — deployment config module

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` (`tsx --test`) — **10/10 pass** (`src/config/load.test.ts`: defaults valid,
  deep-merge, washers-only site, and rejection of bad fraction / hold time / IANA zone /
  stale window / non-integer count / empty roster).
- `npm run check:data` — **pass** (no data staged).

### 2026-08-28 — dataset pipeline + eval/agent skeleton

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` — **20/20 pass** (config 10, `src/eval/score.test.ts` 5, `src/agent/parse.test.ts` 5).
- `npm run dataset:prepare` — 16 originals → **45 frames**, 5.2 MB, metadata-stripped
  (produced locally; held out of git pending authorization + redaction — see WORKLOG).
- `npm run eval -- --mode=baseline --split=evaluation` — runs end-to-end (empty split /
  Fake vision client; real client + labels pending).

### 2026-08-28 — out_of_order state + labelling workflow

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**.
- `npm test` — **23/23** (config 10, `score.test.ts` 8 incl. 3 `out_of_order`, `parse.test.ts` 5).
- `npm run label:new` / `label:check` / `label:stats` — run (0 labels yet).

### 2026-08-28 — initial ground-truth labels

- `npm run typecheck` / `npm run lint` — **pass**; `npm test` — **23/23**.
- `npm run label:check -- --split=evaluation` — **OK** (9 frames, 61 observations:
  27 free / 10 occupied / 8 out_of_order / 16 unknown).
- Author spot-check of the 9 label files: **approved as correct** (2026-08-28).

### 2026-08-28 — portal page

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass** (page prerenders from the
  committed report, no API call); `npm test` — **27/27** (+4 for `room-status`).
- `npm run dev` → the room view at `/`; screenshots in `docs/assets/`.

### 2026-08-28 — cost controls + Iter-1 review fixes

- `typecheck` / `lint` pass; `npm test` **23/23**.
- Default `agent.visionModel` → `claude-haiku-4-5` (cost); `max_tokens` 4000 → 1500;
  `VisionResponse.model` persisted in the cache; 27 cache files backfilled with
  `claude-sonnet-5`. Both `--replay` runs still reproduce 31.1% / 31.1% and the report
  regenerates byte-identically.
- Compliance re-review of Iteration 1 was **CHANGES REQUIRED** (unsupported "3 samples"
  claim) — fixed to "one unaveraged sample per mode"; added a Recorded-agent-run table to
  `docs/REPRODUCTION.md`, D-0013 for the pipeline structure, and renamed the
  `verifiedMachineIds` meta field.

### 2026-08-28 — agent Iteration 1 (verification pass)

- `npm run eval -- --mode=agent --split=evaluation --live` — 18 `claude-sonnet-5` calls
  (9 classify + 9 verify), $0.17. **accuracy 31.1% · harmful-error 8.9% · coverage 51.1% ·
  acc-on-covered 60.9% · `out_of_order` 2/8**. Report:
  `docs/artifacts/eval-agent-2026-08-28.json`; replay cache: `data/cache/agent/` (18 files,
  committed, reproduces frames-absent).
- Removed dead-end: abstaining on any machine below the 0.7 verification threshold →
  coverage collapsed to ~4% (dev observation, not archived). Recalibrated to a 0.35 floor
  on *answered* machines only.
- `typecheck` / `lint` pass; `npm test` **23/23**.

### 2026-08-28 — first baseline run

- `npm run eval -- --mode=baseline --split=evaluation --live` — 9 `claude-sonnet-5` calls,
  $0.081. **accuracy 31.1% · harmful-error 11.1% · coverage 60.0% · acc-on-covered 51.9%**
  (45 determinate obs). Confusion: `out_of_order` 0/8 correct; 11/27 free → `unknown`.
- **`requestHash` no longer folds the image bytes into the cache key** (they did, which made
  `--replay` need the git-ignored frames). Verified: `data/public/frames/` removed +
  `ANTHROPIC_API_KEY` unset → `--replay` reproduces the identical numbers from
  `data/cache/baseline/` (9 files, ~34 KB, committed). Report artifact drops its timestamp
  so it regenerates byte-identically.
- `typecheck` / `lint` pass; `npm test` **23/23**.

### 2026-08-28 — real Claude vision client

- `npm run typecheck` / `npm run lint` — **pass**; `npm test` — **23/23**.
- `npm run eval -- --mode=baseline --split=<one frame> --fake` — runs end-to-end with the
  Anthropic SDK wired (no live call). Backend flag now mandatory (`--live`/`--replay`/`--fake`).
  First `--live` run pending `.env` + labelled split.

### 2026-08-28 — frame redaction pipeline

- `npm run typecheck` / `npm run lint` / `npm run build` — **pass**; `npm test` — **23/23**.
- `npm run dataset:prepare -- --force` — 45 frames, redaction applied from
  `data/raw/redactions.json` (16 source specs); `npm run check:data` passes.
- Manual spot check: frontal frames clean (phone/email/QR blurred, displays sharp);
  `IMG_8629-8633` group needs rectangle tuning — frames stay held out of git.
