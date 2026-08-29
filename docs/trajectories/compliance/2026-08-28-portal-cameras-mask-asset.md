# Compliance review — seeded cameras, mask, `/api/asset`, unified lists

**Date:** 2026-08-28
**Reviewer:** `hackathon-compliance` subagent
**Change:** Portal front-end + two API additions + a data seed, staged since `d30e814`.

- Shared `DisclosureButton` + `CountRow`; `Section` and `MachineGrid` unified; Live status
  restyled (big free-count figures + coloured `CountRow`, `Available now:` removed).
- `data/site-config.json` seeded with 5 cameras (`C-01…C-05`), stub images = the 9
  committed eval frames. `MAX_AUTO` 60→20. File `.prettierignore`d.
- `Camera.mask?` added (schema + `/api/cameras` + `/api/upload` `camera-mask`); stored
  only, runtime compositing deferred to D-0016.
- New `GET /api/asset?path=` — read-only image preview endpoint.
- `cameras-editor.tsx`: thumbnail + `replace` + `remove` (reference-only). `type` selector
  removed from the machine editor rows.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. `/api/asset` is read-only, `..`-rejected, allow-listed, magic-byte sniffed, same
"integrator-only local, no auth" trust boundary as its siblings. Diff has no secrets (only
an `ANTHROPIC_API_KEY` mention in a docstring). Seeded `stubImage` paths point at the 9
already-committed author-owned eval frames; the `data/site-config/<id>/` upload dir stays
git-ignored. **G2/G9 eval boundary is not affected:** the eval agent pipeline
(`src/agent/pipeline.ts` → `classifyPrompt`) reads only `site.machines`, never
`site.cameras`; the seeded cameras are consumed solely by `/api/refresh` (the portal
runtime hook), which is key-free by default = 0 model calls. `npm test` still 51/51.

### Risks (score / process) — and how they were handled

1. **`docs/REPRODUCTION.md` cost note stale** (lines 51-53): still said `/api/refresh` needs
   "a key and at least one camera stub image (none are committed)" and "stops after 60
   cycles". → **Fixed** in this commit: it now states 5 seeded cameras (stub images = the
   committed frames), ~5 Anthropic calls per manual refresh with a key, auto caps at 20
   cycles (~100 worst case), results cached under `data/cache/live/`.
2. **Compliance trajectory + WORKLOG verdict note missing.** → **This file**, plus a verdict
   line appended to the WORKLOG top entry.

### Notes

- Reviewer noted `/api/asset`'s `data/site-config/` root was broader than needed (would
  serve any uploaded image, unauthenticated). → **Tightened**: `data/site-config/` reads
  are now allowed only for paths a camera in `data/site-config.json` currently references
  (`stubImage` / `annotatedShot` / `mask`); `data/public/frames/` stays wholesale (committed
  public content). Verified: an unreferenced `data/site-config/...` path now returns 400.
- Older WORKLOG / trajectory entries mentioning `MAX_AUTO = 60` / "0 cameras" are
  append-only history and were left unedited.
