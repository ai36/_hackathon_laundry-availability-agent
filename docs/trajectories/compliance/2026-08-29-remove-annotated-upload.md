# Compliance review — 2026-08-29 — remove the annotated-shot upload from the portal

**Change under review:** the Cameras editor `annotated shot` `ImageField`, the
`camera-annotated` kind in `/api/upload`, and the `annotatedShot` key in the `/api/cameras`
body were removed. `Camera.annotatedShot?` (schema), the `data/site-config.json` values, the
`img_*.annotated.jpg` files, and `--mode=calibrated` are kept. 7 files, docs updated.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G9 / G10** — the −13.7 pp `--mode=calibrated` dead-end stays reproducible: the schema
  field, the 5 `annotatedShot` values in `data/site-config.json`, the `.gitignore`-allowed
  `img_*.annotated.jpg` files, `src/agent/calibrated.ts`, and `/api/asset`'s allow-list of
  `cam.annotatedShot` are all untouched. No eval / artifact / measured-number change, so no
  CHANGELOG Progression row is required.

### Risk handled

- **Doc trail.** The D-0015 primary decision body (Cameras-CRUD bullet, ~line 787) still
  described an "annotated shot uploaded via `POST /api/upload`" with no superseded marker,
  contradicting the current portal surface (the two dated amendments below already correct
  it). → Added a parenthetical pointer on that bullet to the amendments.

### Notes (from the review)

- Scoping is coherent and complete — no dangling references. The remaining `annotatedShot`
  hits (`camera-classify.ts`, `calibrated.ts`, `asset/route.ts`, tests) are backed by the
  kept schema field + seed values, not the removed portal path.
- `/api/cameras` PATCH `annotatedShot: cur.annotatedShot` passthrough correctly preserves the
  5 seeded values across edits; POST omits it so new cameras get none.
- `/api/refresh` header comment is already accurate (annotated/region-map not on the live
  path). Historical WORKLOG / `data/README` mentions of `camera-annotated` correctly left
  alone.
- Verification: `typecheck` / `lint` / `format:check` / `npm test` 82-82 / `check:data` /
  `build` pass; `npm start` → `/integrator/settings` 200, `camera-annotated` upload 400.
