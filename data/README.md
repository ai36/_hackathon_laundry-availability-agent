# Dataset

Laundry-room frames and labels for calibration and evaluation. See `docs/EVALUATION.md` for
how they are used, `docs/PROBLEM.md` for the label schema and privacy rules, and
`docs/DECISIONS.md` D-0009 for the pipeline.

## Layout

```
data/
  raw/            Local only (git-ignored). Original photos/videos straight off the camera.
  public/
    frames/       Cleaned frame set — downscaled JPEGs, ALL metadata stripped. Produced by
                  `npm run dataset:prepare`. Only the 9 labelled P0 evaluation stills are
                  committed (see "Committed frames" below); everything else stays local.
    README.md     Committed.
  machines.json   Committed. Canonical machine roster (ids + types). See docs/LABELING.md.
  labels/         Committed. One `<frameId>.json` per labelled frame (schema: labels/README.md).
                  Scaffold with `npm run label:new -- <frameId>`.
  splits/         Committed. calibration.txt / evaluation.txt / smoke.txt — disjoint frameId lists.
  cache/          Vision-response cache for `--replay`. git-ignored except cache/README.md;
                  the curated evaluation cache is force-added once real runs exist.
```

## Rules (ground rules 06 / 07 / 08)

- Nothing committed under `data/` may contain a recognisable person, another tenant's
  belongings, apartment numbers, names, or other identifying detail.
- **Strip all embedded metadata from every committed frame** — EXIF (incl. GPS), XMP, IPTC,
  ICC, the COM comment, PNG text chunks. `npm run dataset:prepare` does this; verify with
  `npm run check:data`.
- Frames with people or identifying detail stay only in git-ignored `raw/` and are not
  committed. The "person in frame" case uses a synthetic/augmented image with its source
  recorded in the label file.
- The laundry-room manager's written authorization to film/publish the common area is kept
  out of the repo; its existence is noted in `docs/PROBLEM.md`.
- No credentials or personal data anywhere in `data/`.

## Redaction

Two ways to specify what gets covered, both **keyed by source basename** so one spec covers
every frame from a fixed camera. `npm run dataset:prepare` applies them after the metadata
strip; a mask supersedes rectangles for the same source.

### 1. Per-angle raster mask — recommended for an integrator

Drop `data/raw/masks/<source>.png` (git-ignored). Paint it once, in any image editor, over a
still from that camera **at `frames.maxStillPx` width** (`laundry3.config.ts` — the same
resolution the pipeline and the runtime use): **opaque** pixels become a solid gray patch on
every frame from that source, **transparent** pixels pass through. Any shape. A fixed camera
never moves, so the mask is authored once and reused forever. No coordinates, no per-frame
tuning. (The pipeline rescales a mismatched mask to the frame, but authoring at the target
width keeps edges crisp.)

### 2. Per-source rectangles — used when no mask exists

`data/raw/redactions.json` (git-ignored; schema in `data/redactions.example.json`) lists
`{x,y,w,h,mode}` rectangles per source in produced-frame pixel space. `mode: "blur"`
(default) or `"fill"` (solid gray).

For **this** dataset the rectangles were **hand-drawn by the frame author**, not eyeballed:
the author painted solid black boxes over every identifying element (vendor service sticker /
phone / email, QR codes, notice text, window and TV views) on pristine copies kept in
`data/raw/_reference/` (local); `npx tsx scripts/derive-redactions.ts` recovers those boxes
by connected-component analysis and writes `redactions.json`. Re-run it then
`npm run dataset:prepare -- --force` if the references change.

`--blur-all=N` remains a coarse whole-frame fallback.

## Committed frames

Only the **9 labelled P0 evaluation stills** are committed —
`img_1819`, `img_1821`–`img_1826`, `img_8629`, `img_8633` — each with the author's
redaction boxes burned in. Every determinate machine's status display stays legible; the
boxes cover décor-free identifying content only. Video-derived frames and unlabelled stills
are **not** committed (`.gitignore` allows the 9 by name). `frames/manifest.json` is local.

## Enforcement

`scripts/check-data-privacy.mjs` (`npm run check:data`, also the pre-commit hook) refuses a
commit that stages: anything under `data/raw/` or `data/frames/`; a video anywhere under
`data/`; an image outside `data/public/`; or an image still carrying EXIF / XMP / IPTC /
PNG-text metadata. It is a backstop, not a substitute for visual review.

## Splits

Calibration frames build the per-site config; evaluation frames score baseline and agent.
The lists are **disjoint** — never score on a calibration frame.
