# Compliance review — first baseline number (two rounds)

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** id-passing prompt fix + first `--live` baseline + committed `data/cache/baseline/`
  + `docs/artifacts/eval-baseline-2026-08-28.json` + CHANGELOG/WORKLOG/EVALUATION
- **Date:** 2026-08-28
- **Model:** sonnet

## Round 1 — CHANGES REQUIRED

**Blocker (G10):** `src/agent/vision.ts` `requestHash()` folded the frame image bytes into
the cache filename, but `data/public/frames/` is git-ignored (held pending redaction). On a
clean checkout `--replay` threw "cache miss" — a judge could not reproduce the reported
22.2% with no key. Verified empirically by the reviewer.

Other risks raised: reproducibility claim stated unconditionally; no DECISIONS entry for the
"feed the model the machine-id list" methodology; GT-derived frame membership not disclosed
as a limitation; `off`→`out_of_order` not explained; report `generatedAt` prevented
byte-identical regeneration; 9 frames < "10+ cases".

## Round 2 — PASS

Fixes applied and re-reviewed:

- `requestHash()` hashes only the semantic key (`cacheKey` + prompt + crop); no image read.
  `--replay` verified: `data/public/frames/` moved away + `ANTHROPIC_API_KEY` unset →
  reproduces **31.1% / 11.1% / 60.0% / 51.9%** from `data/cache/baseline/` alone, exit 0.
- Report JSON drops `generatedAt` / `backend` → regenerates byte-identically (no git diff
  after a replay run).
- `docs/DECISIONS.md` D-0012 — the machine-id-list methodology, symmetric to baseline and
  agent; machine discovery is explicitly out of the measured agentic contribution.
- `docs/EVALUATION.md` "Known limitations" — single stochastic sample (22.2%→31.1% between
  runs), GT-derived frame membership, `off`=out-of-order, redaction over displays, 9 frames.
- Cache regenerated (fresh `--live` sample) and re-committed.

**Round-2 verdict: PASS.** G9 clean (every number traces to the committed report), G8 clean
(no PII/secrets in cache or report), D-0012 sound. Standing risks (single sample; 9 frames)
are disclosed; run N samples per mode before the agent-vs-baseline delta is final.
