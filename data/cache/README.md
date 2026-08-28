# data/cache/

Cached vision-model responses, keyed by request hash. `npm run eval -- --replay` serves
every call from here — no `ANTHROPIC_API_KEY`, no cost — so a scored run reproduces exactly.

- `baseline/`, `agent/` — one JSON per request (`<hash>.json`).
- Contents are git-ignored while the pipeline is a skeleton. Once the baseline/agent run
  against the real API, the curated cache for the evaluation split is force-added
  (`git add -f data/cache/...`) and committed as reproduction evidence.

Populate: run `npm run eval -- --mode=baseline --split=evaluation` once with a key set.
