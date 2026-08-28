# Compliance review — dataset pipeline + eval/agent skeleton

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged dataset-pipeline scripts, eval/agent code skeleton, docs + config
  updates. The 45 real frames were withdrawn from the commit before review and are
  git-ignored pending authorization + redaction.
- **Input:** `git diff --staged`, plus an independent byte check of the unstaged frames
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. The risky artifact (real frames) was withdrawn and git-ignored behind an explicit
  re-enable condition; `npm run check:data` exits 0; no secrets; no consequential actions;
  G2 section present.

### Risks (score / process)
1. `docs/WORKLOG.md` transcribed the vendor sticker phone number verbatim — the exact
   detail being redacted → remove it from the entry.
2. Top-level `data/README.md` was stale (old `data/frames/` layout, `cache/local/`, no
   held-out status) → reconcile with `data/public/README.md` and D-0009.
3. New WORKLOG entry bullet 4 said `.gitignore` keeps `frames/` while bullet 3 said it is
   held out → fix bullet 4.
4. Stripper wording: `stripJpegAppSegments` removed APPn but left the JPEG COM (0xFE);
   ffmpeg writes a `Lavc<version>` COM → extend the stripper to drop COM and tighten wording.
5. `docs/CHANGELOG.md` "45 frames, 5.2 MB" describes a local-only artifact judges can't
   regenerate (needs `data/raw/`) → keep the real baseline number on the critical path.

### Notes
- G8 clean; only `ANTHROPIC_API_KEY` as an env-var name.
- G3: ffmpeg invoked as an external system tool, not bundled, not a dependency; script
  checks for it. Version unpinned → record it when frames/numbers land.
- G4/G5: no network calls (FakeVisionClient only; real client is a TODO).
- Byte check of the 45 unstaged frames: `-map_metadata -1` + APPn stripper removed
  EXIF/GPS/XMP/IPTC/ICC/Adobe; only a libavcodec COM remained. Real exposure is image
  content (sticker phone number, window views) — holding them out is correct.
- `laundry3.config.ts` 16/16 = 32 machines vs PROBLEM.md "~20–30" → note it.

## Follow-up actions taken

Same commit: phone number removed from WORKLOG; `data/README.md` rewritten to the current
layout + held-out status; WORKLOG bullet 4 fixed; `stripJpegAppSegments` now also drops COM
(0xFE), frames regenerated and byte-checked clean, wording tightened in WORKLOG + D-0009;
`docs/REPRODUCTION.md` records ffmpeg 8.1.2; `docs/PROBLEM.md` and `src/config/defaults.ts`
machine-count wording reconciled (dataset site = 32). Real baseline number stays the next
critical-path item.
