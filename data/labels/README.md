# data/labels/

One JSON file per labelled frame: `<frameId>.json` where `<frameId>` matches a file in
`data/public/frames/` (without the `.jpg`). Files named `*.example.json` or starting with
`_` are ignored by the loader.

Schema (see `docs/PROBLEM.md` for the full description and `src/eval/types.ts` for the
types):

```json
{
  "frameId": "img_1819",
  "timestamp": "2026-08-28T18:40:00-07:00",
  "camera": "A",
  "frameConditions": ["low_light"],
  "machines": [
    {
      "machineId": "W-03",
      "type": "washer",
      "bbox": [1180, 420, 260, 300],
      "state": "occupied",
      "gtDeterminate": true,
      "observationNotes": ["glare_on_door"]
    }
  ]
}
```

- `state`: `free` | `occupied` | `unknown`.
- `gtDeterminate`: `false` only when even a human cannot tell from the evidence — those
  observations are excluded from the primary accuracy metric.
- `bbox`: `[x, y, w, h]` in the produced frame's pixels. **Optional** — only for per-ROI
  calibration (P1); omit it for a baseline / state-accuracy pass.
- Vocabularies for `frameConditions` / `observationNotes` are extensible.

Validate the shape by running `npm run eval -- --split=<name>` — the loader rejects malformed
files with the filename in the error.
