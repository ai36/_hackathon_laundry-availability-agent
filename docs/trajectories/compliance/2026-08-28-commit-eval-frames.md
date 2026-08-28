# Compliance review — 2026-08-28 — commit the 9 eval frames (author-drawn redactions)

**Reviewer:** `hackathon-compliance` subagent
**Change under review:** staged on `dev` — first commit of the 9 labelled P0 evaluation
stills to `data/public/frames/` with author hand-drawn `fill`-box redactions; new
`scripts/derive-redactions.ts`; `.gitignore` allow-list; doc updates (DECISIONS D-0009,
EVALUATION, REPRODUCTION, CHANGELOG, WORKLOG, both data READMEs, README layout line).

## Verdict: PASS (with risks) — not CHANGES REQUIRED

### Blockers (eligibility): none

- **G9 / G10 (measured improvement + reproducibility):** the cache/frame mismatch is **not**
  a blocker on this commit. `data/cache/` (the evidence for baseline 31.1% / agent
  −2.2 pp harmful / +9.0 pp acc-on-covered) is committed, the scoring scripts are committed,
  and `--replay` reproduces the recorded numbers exactly (cache key = semantic request hash,
  image-independent). The change strictly improves the position: before it, no eval frames
  were in the repo and `--live` was impossible; now it is, with the divergence disclosed in
  EVALUATION, REPRODUCTION, D-0009, CHANGELOG. The A/B direction is unaffected — both sides
  used the same earlier frames.
- **G6 / G7 (data):** committed frames visually confirmed redacted — solid gray over
  windows, wall TV, vendor sticker / phone; generic wall art left visible by design; every
  determinate machine's display still legible. `npm run check:data` passes (EXIF / XMP /
  IPTC / PNG-text gate, no video, nothing under `data/raw/` staged).
- **G8 (secrets):** `git diff --cached` scanned for key / token / secret / PEM — clean.
- Only the 9 named stills staged; video-derived and unlabelled frames stay git-ignored.

### Risks (score / process) and how they were handled

1. **Headline numbers were produced against frames not in the repo.** A judge running
   `--live` on the committed frames gets different numbers than documented; "a few points
   lower" is an estimate, not measured.
   → Handled as disclosure now; **must** close before the final deliverable / solution
   video / any refreshed results claim by re-running `--live` on the committed frames and
   refreshing `data/cache/` + the EVALUATION Results tables + CHANGELOG. Tracked as an open
   item in D-0009 ("Known gap (measurement)") and EVALUATION limitations. Pending explicit
   user go-ahead (API budget).
2. **Results tables didn't carry an inline caveat.**
   → Fixed: added a "Caveat (read first)" blockquote directly under the `## Results` header
   in `docs/EVALUATION.md`.
3. **D-0009 2nd amendment dropped the "publish authorization confirmed" clause**, leaning
   entirely on redaction.
   → Fixed: added a "Publish basis unchanged" paragraph to the amendment — redaction is
   defence-in-depth, not a substitute for authorization; explicit **open item** to confirm
   written authorization (yes/no) and record it. Until then the frames rest on redaction +
   "author's own / a friend's room".

### Notes

- Process hygiene satisfied: WORKLOG entry, CHANGELOG row, DECISIONS amendment all present;
  `scripts/derive-redactions.ts` documented in its header and in both data READMEs.
- typecheck / lint / build / `npm test` (27) / `check:data` all reported passing.
- Follow-up in the same session: added per-camera raster-mask support to
  `scripts/prepare-dataset.ts` (`data/raw/masks/<source>.png`, opaque → gray patch) as the
  recommended integrator redaction path; rectangle path unchanged (9 frame hashes identical
  after re-run). Documented in `data/README.md` and D-0009 integrator note.
- Also added a `frames` config section (`maxStillPx` / `maxVideoPx` / `videoFps` in
  `laundry3.config.ts`, validated, +3 tests → 30); both dataset scripts read it as defaults.

## Final re-review (same day, full staged diff)

**Verdict: PASS WITH RISKS — no eligibility blockers; safe to commit + push to `origin/dev`.**

- All 3 earlier risk fixes confirmed landed (EVALUATION caveat blockquote; D-0009 publish-
  basis paragraph + authorization yes/no open item; cache-refresh open item in 4 places).
- No `data/raw/` staged; `.gitignore` allow-list correct; secret scan clean; `--replay`
  reproducibility intact.
- Carried-over risks (not blockers, must close before the final results claim / video):
  (1) recorded numbers predate the committed frames' heavier boxes — "a few points lower"
  is an estimate, refresh `data/cache/` with a `--live` pass on the committed frames;
  (2) written publish authorization for a room the author does not own is still an open
  yes/no in D-0009.
- Minor: fixed a stale `npm test — 27/27` line in the WORKLOG entry (now 30/30).
