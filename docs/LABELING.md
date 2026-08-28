# Labelling Guide

How to turn a set of laundry-room frames into a ground-truth dataset the eval harness can
score. Written to be repeatable by an integrator, not just the author.

Time: ~1–2 min per frame once the roster exists.

## 0. One-time: the machine roster

`data/machines.json` is the canonical list of physical machines. Assign every machine a
**stable id** and keep it forever:

- Washers `W-01…`, dryers `D-01…`.
- Number them in a fixed reading order — left-to-right, then top-to-bottom for stacked
  units — from the main camera's point of view.
- If a machine has a printed number, mirror it (`W-07` ↔ printed "7") so the labeller and
  the model agree.

Edit `data/machines.json` to match the real room. Not every machine has to be visible from
every camera — the roster is the whole room; a frame labels only what it shows.

### Overlapping camera angles

A physical machine may appear in more than one angle. **It keeps the same id in every
frame.** Annotate one reference image per angle (`data/raw/_reference/<SOURCE>.jpg`, e.g.
coloured overlays + `W-07` on each machine); where the same id shows up in two references,
it's the same machine. IDs, not colours, are global — colours can differ between references.

### Camera coverage is a deployment setting

Which machines' indicators are actually readable from a given camera is a property of the
install, not the machine. The integrator records, per angle: the camera position and the
list of machine ids whose state is reliably visible from it. Machines outside that list are
`unknown` from that angle by design — calibration and the runtime use this to abstain
instead of guessing. (Future: this lives in the per-site calibration config.)

## 1. Produce the frames

```bash
npm run dataset:prepare -- --fps=1
npm run check:data
```

Frames land in `data/public/frames/` as `<frameId>.jpg`.

## 2. Choose splits

Two disjoint lists, one id per line, in `data/splits/`:

- **`calibration.txt`** — a few clean frames per camera: good light, all machines visible,
  no obstruction. These build the per-site config.
- **`evaluation.txt`** — the scored set. Spread the conditions: nominal, glare, low light,
  `lights_off_no_motion`, one machine partly occluded, near-empty and near-full, a
  `person_in_frame` (synthetic) frame, and — if present — an `out_of_order` machine. Aim
  for 10+ frames.
- **`smoke.txt`** — 3–5 frames for a quick live run.

A frame must never be in both `calibration` and `evaluation`.

## 3. Label each frame

For every frame id in your splits:

```bash
npm run label:new -- <frameId>        # writes data/labels/<frameId>.json (skeleton)
```

Open `data/public/frames/<frameId>.jpg` and edit the JSON:

| Field | What to put |
| --- | --- |
| `timestamp` | ISO time the frame was taken, if known (`""` otherwise). |
| `camera` | Camera label (`"A"`, `"B"`…). |
| `frameConditions` | Frame-wide tags: `low_light`, `lights_off_no_motion`, `glare`, `backlit`, `motion_blur`, `person_in_frame`, `partial_view`. `[]` if none. |
| `machines[].state` | `free` \| `occupied` \| `out_of_order` \| `unknown` — see rules below. |
| `machines[].gtDeterminate` | `true` normally. `false` **only** when even you cannot tell from this frame (then the observation is dropped from accuracy). |
| `machines[].bbox` | **Optional.** `[x, y, w, h]` in the produced frame's pixels around the machine's status area (door + indicator). Only used for per-ROI calibration (P1) — **omit it** for a state-accuracy / baseline pass. |
| `machines[].observationNotes` | Per-machine tags: `indicator_occluded_by_person`, `indicator_occluded_by_object`, `indicator_partial`, `glare_on_door`, `door_open`, `ambiguous`. |

**If a machine is not visible in this frame, delete its entry — do not guess.**

### State rules (decide once, apply consistently)

- **`free`** — door closed, no cycle running, drum empty / no laundry. A machine that just
  finished but still holds laundry is **`occupied`** (a user can't take it).
- **`occupied`** — running, or holding laundry, or the panel shows time remaining.
- **`out_of_order`** — taped off, unplugged, an "Out of Service" sign, or the display shows
  a hard error (e.g. `E rot`, `Err`). A user cannot use it.
- **`unknown`** — the indicator is blocked, the room is dark, or glare hides the state and
  you genuinely cannot decide. Prefer `unknown` over a coin-flip; the metric rewards an
  honest abstention over a wrong `free`.

Record any judgement call you had to make in the frame's `observationNotes` or a comment in
the split file, so a second labeller reproduces it.

### Optional accelerator

Draft labels with the model, then correct every machine by hand:

```bash
npm run eval -- --mode=baseline --split=evaluation      # needs ANTHROPIC_API_KEY
```

The label file — not the model — is the ground truth. A human must confirm each machine.

## 4. Validate

```bash
npm run label:check -- --split=evaluation     # ids in roster, no dups, splits disjoint, images exist
npm run label:stats                           # coverage + state distribution
```

Fix everything `label:check` reports before running the scored eval.

## 5. Run the eval

```bash
npm run eval -- --mode=baseline --split=evaluation            # first run: writes the cache
npm run eval -- --mode=agent    --split=evaluation --replay   # key-free, from cache
```

See `docs/EVALUATION.md` for what the numbers mean and `docs/REPRODUCTION.md` for the full
command list.
