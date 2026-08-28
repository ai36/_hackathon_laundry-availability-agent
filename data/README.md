# Dataset

Laundry-room frames and labels for calibration and evaluation. See `docs/EVALUATION.md` for
how these are used and `docs/PROBLEM.md` for the label schema and the privacy rules.

## Layout

```
data/
  raw/            Local only (git-ignored). Original frames straight off the camera/phone.
  frames/         Local only (git-ignored). Working copies before cleanup.
  public/         Committed. Cleaned frames that may ship: no people, no third-party
                  belongings, apartment numbers / names blurred, cropped to machine faces
                  where needed.
  labels/         Committed. One JSON file per frame, schema in docs/PROBLEM.md.
  splits/         Committed. calibration.txt / evaluation.txt — disjoint lists of frame_ids.
  cache/          Committed (curated). Cached model responses + agent trajectories for
                  --replay. Large local scratch goes in cache/local/ (git-ignored).
```

## Rules (ground rules 06 / 07 / 08)

- Nothing in `data/public/`, `data/labels/`, or `data/cache/` may contain a recognisable
  person, another tenant's belongings, apartment numbers, names, or other identifying detail.
- **Strip all embedded metadata from every committed frame** — EXIF (incl. GPS), XMP, IPTC,
  PNG text chunks. Phone/camera files carry GPS, device serial, and timestamps that identify
  the building and the author. Strip before staging, e.g. `exiftool -all= FILE` or
  `magick mogrify -strip FILE`. Prefer re-encoding to plain JPEG/PNG; do not commit HEIC/TIFF.
- Frames with people are kept only in git-ignored `raw/` and are **not** committed; the
  "person in frame" case uses a synthetic/augmented image with its source recorded in the
  label file.
- Written authorization from the laundry-room manager covering filming the common area is
  kept out of the repo; note its existence in `docs/PROBLEM.md`.
- No credentials or personal data anywhere in `data/`.

## Enforcement

`scripts/check-data-privacy.mjs` (also `npm run check:data`) is a gate, run as a pre-commit
hook. It refuses a commit that stages: anything under `data/raw/` or `data/frames/`; an
image under `data/` outside `data/public/`; or an image that still carries EXIF / XMP / IPTC
/ PNG-text metadata. Enable the hook once per clone:

```bash
git config core.hooksPath .githooks
```

The gate checks markers in the staged bytes — it does not scrub. It is a backstop, not a
substitute for the visual review above.

## Splits

Calibration frames build the per-site config; evaluation frames score baseline and agent.
The two lists are **disjoint** — never score on a calibration frame.
