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
                  `npm run dataset:prepare`. Currently git-ignored / held out (see below).
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

## Held-out frames

The 45 frames produced from the current originals are **git-ignored** pending (a) confirmed
authorization to publish and (b) redaction of a vendor service sticker (phone number) and
outdoor window views. Re-enable by deleting the `/data/public/frames/` line in `.gitignore`.

## Enforcement

`scripts/check-data-privacy.mjs` (`npm run check:data`, also the pre-commit hook) refuses a
commit that stages: anything under `data/raw/` or `data/frames/`; a video anywhere under
`data/`; an image outside `data/public/`; or an image still carrying EXIF / XMP / IPTC /
PNG-text metadata. It is a backstop, not a substitute for visual review.

## Splits

Calibration frames build the per-site config; evaluation frames score baseline and agent.
The lists are **disjoint** — never score on a calibration frame.
