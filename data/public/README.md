# data/public/

Committed dataset.

- `frames/` — the cleaned frame set: downscaled JPEGs with **all metadata stripped**
  (no EXIF, GPS, device id, ICC). Produced by `npm run dataset:prepare` from local
  originals in the git-ignored `data/raw/`.
  **Only the 9 labelled P0 evaluation stills are committed** — `img_1819`,
  `img_1821`–`img_1826`, `img_8629`, `img_8633` — each with the frame author's hand-drawn
  redaction boxes burned in (vendor service sticker / phone, window and TV views). Every
  machine status display stays legible. Video-derived and unlabelled frames, and
  `frames/manifest.json`, stay local; `.gitignore` allows the 9 stills by name.
- `README.md` — this file.

Everything else under `data/public/` is git-ignored (see `.gitignore`), so dropping raw
photos or videos here will not accidentally commit them. Video is never committed —
`npm run check:data` blocks it.

Regenerate after adding originals:

```bash
npx tsx scripts/derive-redactions.ts   # rebuild redactions.json from data/raw/_reference/
npm run dataset:prepare -- --force      # stills + 1 frame/sec from each video, redacted
npm run check:data                      # must pass before committing
```
