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
                  `npm run dataset:prepare`. Only the 5 labelled evaluation stills (one per calibrated camera), each
                  with its .annotated.jpg + .mask.png, are committed (see "Committed frames"
                  below); everything else stays local.
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
- **No management authorization was obtained** for the committed frames. The basis for
  publishing them is: a shared common area open to all residents, no people or third-party
  belongings in frame, and redaction of every location-identifying element. This is the
  author's own risk call — see `docs/DECISIONS.md` D-0009 ("Publish basis"). If it is
  challenged, the frames are removed and the eval runs `--replay` from the committed cache.
- No credentials or personal data anywhere in `data/`.

## Redaction

Two ways to specify what gets covered, both **keyed by source basename** so one spec covers
every frame from a fixed camera. `npm run dataset:prepare` applies them after the metadata
strip; a mask supersedes rectangles for the same source.

### 1. Per-angle raster mask — recommended for an integrator

Drop `data/raw/masks/<source>.png` (git-ignored). Paint it once, in any image editor, over a
still from that camera **at `frames.maxStillPx` width** (`laundry3.config.ts` — the same
resolution the pipeline and the runtime use):

- **transparent background = keep / analyse**
- **solid black `rgb(0,0,0)` = exclude** — covered on every frame from that source.

Any shape. The mask may black out the whole frame **except** one machine's indicator area, to
scope a camera to a single machine — privacy redaction and analysis-scoping are the same
tool (see `docs/DECISIONS.md` D-0015). A fixed camera never moves, so the mask is authored
once and reused forever. No coordinates, no per-frame tuning. (The pipeline rescales a
mismatched mask to the frame, but authoring at the target width keeps edges crisp. It fills
excluded regions with solid gray so the strip is visibly inert.)

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

Only the **5 labelled evaluation stills**, one per calibrated camera, are committed —
`img_1819` (C-01), `img_1821` (C-02), `img_1822` (C-03), `img_1823` (C-04), `img_8633` (C-05)
— each with the author's redaction boxes burned in, plus a `<id>.annotated.jpg` (machine ids
drawn on the view) and `<id>.mask.png` (transparent over the panels that decide state). Every
determinate machine's status display stays legible. Video-derived and unlabelled frames are
**not** committed (`.gitignore` allows the 15 files by name). `frames/manifest.json` is local.

## Enforcement

`scripts/check-data-privacy.mjs` (`npm run check:data`, also the pre-commit hook) refuses a
commit that stages: anything under `data/raw/` or `data/frames/`; a video anywhere under
`data/`; an image outside `data/public/`; or an image still carrying EXIF / XMP / IPTC /
PNG-text metadata. It is a backstop, not a substitute for visual review.

## Splits

Calibration frames build the per-site config; evaluation frames score baseline and agent.
The lists are **disjoint** — never score on a calibration frame.
