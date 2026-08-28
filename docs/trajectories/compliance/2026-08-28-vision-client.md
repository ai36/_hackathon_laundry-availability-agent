# Compliance review — real Claude vision client

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged `AnthropicVisionClient` + `@anthropic-ai/sdk` dep + `run-eval.ts`
  backend flags + DECISIONS D-0011 / WORKLOG / CHANGELOG / REPRODUCTION updates
- **Input:** `git diff --staged`
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G3: `@anthropic-ai/sdk@0.122.0` is Anthropic's first-party MIT SDK, used within
  terms. G8: no key material; `.env*` git-ignored with `!.env.example`; `.env.example` ships
  an empty key; client uses `new Anthropic()` (env-only). No live call has run.

### Risks (score / process)
1. **Cost gating (G4 spirit):** a bare `npm run eval` now defaulted to the paid live path
   (was `FakeVisionClient`) → make live opt-in.
2. **Cache poisoning:** `--fake` wrote empty responses into the same `data/cache/<mode>/`
   dir `--replay` reads, same request hash, no provenance → `--fake` must bypass the cache.
3. **Doc vs code:** D-0011 said "the eval report sums them" but only per-frame `meta` was
   written → add a `totals` field or reword.
4. **Price-table drift:** `PRICE_PER_MTOK` had no source or as-of date; `costUsd` silently
   `undefined` for unlisted models → date it.

### Notes
- Consistency otherwise good: backend flags match D-0011; `config.agent.visionModel`
  (`claude-sonnet-5`) matches the price-table key and WORKLOG "$2/$10"; 4×4 confusion
  matrix matches `score.ts` STATES; D-0005 status line now matches the 4-state space.
- The `claude-api` skill that shaped the client is an environment skill, not in the repo —
  its guidance isn't visible to a judge.
- `req.crop` is in `requestHash` but ignored by the client (documented) — resolve when the
  per-ROI classify step lands.
- `output_config: { effort: "low" }` and `usage.cache_*` fields unverified against a live
  response — only typecheck so far.

## Follow-up actions taken

Same commit: all 4 risks fixed — `run-eval.ts` now requires **exactly one** of
`--live` / `--replay` / `--fake` (bare run errors); `--fake` returns `FakeVisionClient`
directly with no `CachedVisionClient` wrapper (no cache writes); a `totals` block (vision
calls, tokens, `costUsd`) is computed, written to the report, and printed; `PRICE_PER_MTOK`
carries a "rates as of 2026-08-28, source" comment. D-0011 / WORKLOG / CHANGELOG /
REPRODUCTION updated to match. Notes (skill visibility, crop, live-unverified effort) tracked.
