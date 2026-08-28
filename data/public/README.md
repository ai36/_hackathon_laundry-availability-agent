# data/public/

Committed dataset.

- `frames/` — the cleaned frame set: downscaled JPEGs with **all metadata stripped**
  (no EXIF, GPS, device id, ICC). Produced by `npm run dataset:prepare` from local
  originals in the git-ignored `data/raw/`. `frames/manifest.json` records each frame's
  source and, for video-derived frames, an approximate timestamp.
  **Currently git-ignored** — held out until the laundry-room manager's authorization to
  publish is confirmed and identifying details (vendor service sticker / phone number,
  outdoor window views, any apartment numbers) are redacted. Re-enable by deleting the
  `/data/public/frames/` line in `.gitignore`.
- `README.md` — this file.

Everything else under `data/public/` is git-ignored (see `.gitignore`), so dropping raw
photos or videos here will not accidentally commit them. Video is never committed —
`npm run check:data` blocks it.

Regenerate after adding originals:

```bash
npm run dataset:prepare -- --fps=1     # 1 frame/sec from each video
npm run check:data                     # must pass before committing
```
