# Compliance review — 2026-08-29 — recalibrated eval (9→5 camera-scoped frames)

**Change under review:** the eval rebuilt around the D-0015 calibration model — 5 stills (one
per camera C-01–C-05, each re-retouched + `.annotated.jpg` + `.mask.png`), per-camera
`machineIds` scoping, `--mode=calibrated` (a documented dead-end), a re-measured baseline +
corrections, and the docs rewrite. ~92 files.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G2** — dated, logged hackathon work.
- **G3** — no new deps; only `AnthropicVisionClient` `max_tokens` 1500 → 4000.
- **G4 / G5** — corrections are human overrides on frozen data, integrator in the loop, no
  real-world side effects.
- **G6 / G7** — reviewer spot-checked `img_1819.jpg` / `.annotated.jpg`: redaction covers the
  vendor sticker, wall art, dryer panels; determinate displays legible; no people or personal
  items; consistent with the D-0009 publish basis. `npm run check:data` scans the 10 new
  images and exits 0.
- **G8** — `git diff --cached` grep for key/secret/token/ANTHROPIC/bearer: clean. Artifacts
  hold only token counts + rationales.
- **G9 / G10** — reviewer independently reproduced `--mode=calibrated --replay` and
  `--mode=baseline --replay --corrections`: both byte-identical to the committed
  `docs/artifacts/eval-*-2026-08-29.json`, and 31.8% / 68.2% match every doc.

### Risks and how they were handled

1. **Evaluation shrank (9→5 frames, 45→22 obs), and `docs/EVALUATION.md` still enumerated 15
   P0 cases + a person-in-frame hard case the set does not contain.**
   → **Handled:** added a "What the committed set actually covers (2026-08-29)" subsection to
   `docs/EVALUATION.md` — a per-frame condition/case table, an explicit list of the unbuilt
   cases (5–10, 9b, 15), and a note that `out_of_order` is deliberately over-represented.

2. **Deleting the four `eval-*-2026-08-28.json` + `data/cache/agent/` left the retained
   historical Progression rows citing dangling paths and a false "`--replay` reproduces it".**
   → **Handled:** restored the four reports under `docs/artifacts/historical/`; rewrote the
   Baseline / Iteration 2 Progression rows and the "Historical" section to point there, and
   dropped the live-reproduce claim (the reports carry full per-frame predictions; the caches
   are recoverable from pre-2026-08-29 git history).

3. **Headline "68.2% / +22.7 pp" is baseline + 5 label-derived overrides; with n=22 the
   corrected fraction is 5/22.**
   → **Handled:** README and `docs/EVALUATION.md` now also report the **model-capability
   number** — 10/17 = 58.8% on the observations no correction touches — alongside the honest
   "an integrator overrode 5 of 22 cells" phrasing that was already there.

4. **Owner-authored `machineIds` scopes set both N and where the corrections land; no
   rationale given.**
   → **Handled:** `docs/EVALUATION.md` now has a per-camera "why each camera scopes the
   machines it does" paragraph (physical field of view), and flags the C-02/C-03 overlap on
   D-01/D-02 as an intentional multi-view (case 2). The A/B itself is fair — same scope both
   sides, verified by replay.

5. **New eval mode / `runCalibrated` and the calibration `--live` runs had no trajectory
   record.**
   → **Handled:** added `docs/trajectories/baseline/2026-08-29-recalibrated.md` (baseline +
   the calibrated dead-end on `img_1823`, with the per-machine predictions); updated the
   trajectories README; annotated the superseded `2026-08-28-img_1823.md`.

6. **Process — WORKLOG said compliance "pending"; no trajectory file.**
   → **Handled:** this file; WORKLOG line updated with the verdict and this risk handling.

### Notes

- `scripts/check-data-privacy.mjs` printed a stray `fatal:` for the deleted frame paths
  (caught, exit 0). Fixed to `git diff --cached --diff-filter=d` so deletions are skipped.
- `docs/trajectories/baseline/2026-08-28-img_1823.md` annotated as historical (superseded
  twice) and its dangling `img_1825.md` link removed.
- The calibration dead-end (−13.7 pp, `--mode=calibrated` + `data/cache/calibrated/` kept
  in-tree) is represented honestly and reproducibly — consistent with the earlier
  verification-pass dead-end.
