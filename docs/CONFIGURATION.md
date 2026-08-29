# Configuration

laundry3 has two configs. Don't confuse them:

| | Deployment config | Calibration (site) config |
| --- | --- | --- |
| File | `laundry3.config.ts` (root) | `data/site-config.json` (path is a setting) |
| Who edits it | a human integrating the system | the calibration agent, from human-confirmed frames |
| Contents | operational knobs (below) | per-machine ROIs, reference crops, thresholds |
| Validated | yes, on load (`src/config/load.ts`) | by the calibration step |

This page documents the **deployment config**.

## How it works

- `src/config/defaults.ts` holds every default value.
- `laundry3.config.ts` overrides only what a site needs; omitted fields fall back to the
  default. It is type-checked via `defineConfig(...)`.
- For private overrides that must not be committed, create `laundry3.config.local.ts`
  (git-ignored) and import/spread it inside `laundry3.config.ts`.
- On load, defaults + overrides are deep-merged and **validated**; an out-of-range or
  malformed value throws `ConfigError` with the offending field named.
- Code reads the resolved config with `import { config } from "@/config"`.
- `npm test` covers the loader and validator (`src/config/load.test.ts`).

## Settings

### `site`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `site.name` | string | `"laundry3 dev site"` | Label shown in logs and on the portal. |
| `site.timezone` | IANA zone | `"America/Los_Angeles"` | Time zone for tenant-facing timestamps. Validated against `Intl`. |
| `site.machines.washers` | int ≥ 0 | `12` | Declared washer count. |
| `site.machines.dryers` | int ≥ 0 | `12` | Declared dryer count. Total (`washers + dryers`) must be ≥ 1. The authoritative roster (ids, exact types, positions) is the calibration config; load warns on a total mismatch. |

### `reservation` (P2)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `reservation.enabled` | bool | `false` | Master switch. `false` → portal is read-only. Default is `false` until the reservation simulation (P2) is built; the other `reservation.*` values are the intended production settings. |
| `reservation.holdMinutes` | number > 0 | `5` | How long a reservation holds a free machine before auto-expiry. |
| `reservation.maxActivePerUser` | int ≥ 1 | `1` | Concurrent reservations one tenant may hold. |
| `reservation.maxReservedFractionOfFree` | 0..1 | `0.5` | Cap on the share of currently-free machines that may be reserved at once. |
| `reservation.reconcileOnExpiry` | bool | `true` | Re-derive real state from the camera when a hold ends. |

### `agent`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `agent.visionModel` | string | `"claude-haiku-4-5"` | Claude vision model id for frame/ROI analysis. Default is haiku for cost ($1/$5 per MTok). |
| `agent.visionEffort` | `"none"` \| `"low"` \| `"medium"` \| `"high"` | `"none"` | Reasoning-effort hint (`output_config.effort`). `"none"` omits the parameter — **required for `claude-haiku-4-5`**, which rejects it. `"low"`/`"medium"`/`"high"` work on models that support effort control (`claude-sonnet-5`, `claude-opus-5`). |
| `agent.maxVisionCallsPerFrame` | int ≥ 1 | `8` | Hard cap on vision API calls per processed frame (cost guard). |
| `agent.abstainWhenUncertain` | bool | `true` | Emit `unknown` instead of guessing when evidence is insufficient. |
| `agent.verification.enabled` | bool | `true` | Run a second-pass check on low-confidence machines before publishing. |
| `agent.verification.confidenceThreshold` | 0..1 | `0.7` | Confidence below which verification is triggered. |
| `agent.changeDetection.enabled` | bool | `false` | P1: skip re-analysing an ROI that hasn't visibly changed. |
| `agent.changeDetection.minChangedFraction` | 0..1 | `0.02` | Minimum changed fraction of an ROI to count as "changed". |

### `frames`

Frame resolution for the dataset pipeline and the runtime. `frames.maxStillPx` is the
single source of truth: the dataset pipeline downscales stills to it, a per-camera redaction
mask (`data/raw/masks/<source>.png`) is authored at it, and the runtime feeds the agent
frames at it — mask and camera frame must share one resolution. It caps **width** (the
source frames are landscape); height follows by aspect ratio. Only scales down.
`scripts/prepare-dataset.ts` uses `frames.maxStillPx` / `frames.maxVideoPx` as the
`--max-still` / `--max-video` defaults. Video sampling rate is a dataset-prep detail, not a
deployment knob: `--fps` defaults to `1` in the script, independent of the config.

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `frames.maxStillPx` | int ≥ 64 | `1600` | Target width for downscaled still frames. |
| `frames.maxVideoPx` | int ≥ 64 | `1280` | Target width for frames extracted from source video. |

### `runtime`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `runtime.captureIntervalSeconds` | number > 0 | `15` | How often a fresh screenshot is pulled from **each camera** and sent to the agent. 1 s works but is token-expensive; 10–15 s is typical. Must be ≤ `stateRefreshSeconds`. |
| `runtime.stateRefreshSeconds` | number > 0 | `30` | How often the runtime re-derives the published per-machine state by fusing the latest captures. Must be ≥ `captureIntervalSeconds`. |
| `runtime.staleAfterSeconds` | number > 0 | `120` | Portal marks a status "stale" past this age. Must be ≥ `stateRefreshSeconds`. |

### `cycles` (P1)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `cycles.defaultWashMinutes` | number > 0 | `35` | Fallback wash-cycle length for "free in ~X min". |
| `cycles.defaultDryMinutes` | number > 0 | `50` | Fallback dry-cycle length. |

### `portal`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `portal.showConfidence` | bool | `true` | Show a per-machine confidence indicator. |
| `portal.confirmOnArrivalNotice` | bool | `true` | Show a "confirm on arrival" caveat for free/unknown machines. |

### `paths`

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `paths.siteConfig` | string | `"data/site-config.json"` | Calibration output location. |
| `paths.dataset` | string | `"data"` | Dataset root (frames + labels + splits). |
| `paths.cache` | string | `"data/cache"` | Cached model responses + trajectories for `--replay`. |
