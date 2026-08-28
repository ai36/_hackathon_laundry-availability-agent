# data/splits/

Plain-text frame-id lists, one id per line (`#` starts a comment). The two splits must be
**disjoint** — never score on a calibration frame.

- `calibration.txt` — frames the calibration step uses to build the per-site config
  (per-machine ROIs, reference cues), with human-confirmed labels.
- `evaluation.txt` — frames the baseline and the agent are scored on.
- `smoke.txt` — a 3–5 frame subset for a quick live (non-`--replay`) sanity run.

Add ids as frames are labelled. `npm run eval -- --split=evaluation` reads the list.
