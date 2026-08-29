# Compliance review — 2026-08-29 — `/api/refresh` camera-aware classify prompt

**Change under review (Commit C):** a portal-only `cameraClassifyPrompt` that folds roster
`promptFragment` hints and a camera's `annotatedShot` + `mask` (as extra reference images)
into the `POST /api/refresh` vision call. Eval code paths untouched.
Files: `src/agent/camera-classify.ts` (new), `src/agent/camera-classify.test.ts` (new),
`src/agent/vision.test.ts` (new), `src/agent/types.ts`, `src/agent/vision.ts`,
`src/app/api/refresh/route.ts`, `docs/DECISIONS.md`, `docs/REPRODUCTION.md`,
`docs/WORKLOG.md`, `docs/CHANGELOG.md`.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None.

- **G3** — only the already-used `@anthropic-ai/sdk` is exercised; no new dependency
  (`sharp` compositing explicitly declined).
- **G4/G5** — no new irreversible action. The live read is `ANTHROPIC_API_KEY`-gated (the
  judge's default path makes zero calls) and stays fused *below* authoritative D-0014 human
  corrections.
- **G8** — no secrets in the diff; the change actively *removes* a `process.cwd()` leak from
  the `/api/refresh` JSON response (now returns a `refs` count, not resolved absolute paths).
- **G9/G10** — the fair-baseline comparison is not touched. `baselinePrompt` /
  `classifyPrompt` / `runAgent` / `runBaseline` are unchanged; `requestHash` only extends
  when `extraImagePaths` is non-empty, and `src/agent/vision.test.ts` pins it byte-identical
  to the pre-change algorithm for every eval request. `--replay` reproduces 57.8% / 62.2%.

### Risks and how they were handled

1. **The feature is latent (score / measured-improvement).** None of the 5 seeded cameras
   carry a `promptFragment`, `annotatedShot`, or `mask`, so `cameraClassifyPrompt` degrades
   to baseline wording on every real invocation; there is no integration test driving
   `/api/refresh` with real annotated/mask assets. As submitted it moves no metric and
   cannot be shown working to a judge.
   → **Handled by scoping, not by claiming.** The CHANGELOG entry (under "Verification
   runs", not a Progression row) and the D-0015 amendment now state explicitly that
   authoring the calibration assets and a measured `--live` pass over `/api/refresh` are
   **future work**. No win is implied. Adding real assets (drawn annotations, mask PNGs,
   guessed per-machine fragments) and a paid `--live` run were out of scope for this change
   and not authorised.

2. **Process (CLAUDE.md §2).** WORKLOG had a `_(pending)_` verdict placeholder and no
   trajectory file.
   → **Handled:** this file; WORKLOG line updated with the verdict and risk handling.

3. **Mask-as-reference is weaker than compositing (design).** Sending the mask as a
   side-by-side image with a "ignore anything under a black region" instruction asks the
   model to register two frames pixel-for-pixel — a weak mechanism versus actually painting
   the mask onto the feed.
   → **Accepted, documented deferral.** The D-0015 amendment records that compositing (a
   `sharp`-style pixel op) is intentionally not done to avoid a native dependency. Its
   effectiveness is unproven and tied to risk 1.

### Notes

- Honesty of representation is good: CHANGELOG, WORKLOG, DECISIONS (D-0015 amendment), and
  REPRODUCTION all state the accuracy effect is UNMEASURED and that the frozen 9-frame eval
  scores the CLI agent, not this route.
- Test-count bookkeeping consistent: REPRODUCTION 64 → 70 matches 4 new tests in
  `camera-classify.test.ts` + 2 in `vision.test.ts`.
- Verification claims (`typecheck` / `lint` / `build` / `npm test 70` / `check:data` /
  replay parity) were recorded in WORKLOG by the author; this review did not re-run them.
