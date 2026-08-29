# `--mode=roi` — repeated samples (2026-08-29)

`claude-haiku-4-5`, the **frozen** ROI config (`src/agent/roi.ts` as committed — the
"left/right stacked-panel" prompt, worn-segment guidance excluded). Same 5 committed frames,
same 22 determinate observations. `npm run eval -- --mode=roi --split=evaluation --live`.

| run | accuracy | harmful-error | coverage | acc-on-covered |
| --- | --- | --- | --- | --- |
| 1 (**retained** — matches `eval-roi-2026-08-29.json` + `data/cache/roi/`) | 40.9% | 9.1% | 86.4% | 47.4% |
| 2 | 40.9% | 13.6% | 81.8% | 50.0% |
| 3 | 40.9% | 4.5% | 86.4% | 47.4% |

**Accuracy is stable at 40.9%** for the frozen config across 3 samples; only the
harmful-error rate and coverage vary run to run. Baseline scored 45.5% (single sample), so
ROI as committed sits **~4.6 pp below the baseline** — a small, consistent shortfall, not a
win.

Earlier in the session three different **prompt variants** were tried (vague up/down;
explicit left/right; + worn-segment guidance) and scored 40.9% / 50.0% / 54.5%. Those runs
were not retained — the higher numbers came from the vaguer prompts, which also raised the
harmful-error rate (up to 13.6%). The committed config is the middle "left/right" variant;
its accuracy happens to land at the same 40.9% as run 1 here.
