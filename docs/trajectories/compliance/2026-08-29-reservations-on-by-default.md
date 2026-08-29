# Compliance review — 2026-08-29 — reservations ON by default; per-tenant limit 2

**Change under review (Commit B):** `laundry3.config.ts` `reservation.enabled` `false → true`
and `maxActivePerUser` `1 → 2` (owner decision), plus the client/server limit-count
consistency fix and doc updates.
Files: `laundry3.config.ts`, `src/app/api/reservations/route.ts`,
`src/components/machine-card.tsx`, `src/stores/machines-store.ts`, `src/stores/root-store.ts`,
`src/app/tenant/page.tsx`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/CONFIGURATION.md`,
`docs/WORKLOG.md`, `README.md`.

## Verdict: PASS

### Blockers (eligibility)

None.

### Risks (score / process)

None material. The change moves no metric, adds no Progression row, and is correctly logged
as a "Verification runs" entry in `docs/CHANGELOG.md` rather than a Progression row.

### Notes (verified independently by the reviewer)

- **Reproducibility unaffected.** `grep` for `reservation` in `src/agent/` and `src/eval/`
  returns zero matches — the eval never reads the `reservation.*` config group.
  `data/reservations.json` and `data/config-overrides.json` are both git-ignored (confirmed
  via `git check-ignore`). `docs/REPRODUCTION.md` already states the offline eval always uses
  `laundry3.config.ts` and never reads reservations, and already expects `64/64` tests — no
  repro-guide edit needed.
- **EVALUATION case S3 not pulled into scope.** S3 depends on the pre-emption /
  reconciliation simulation, which every doc still marks P2 / not built, and is scored on a
  separate reservation-honoured-rate metric, not the primary per-machine accuracy metric.
- **G4/G5.** The reserve action is a simulation-only write to a local git-ignored JSON file,
  gated behind a confirm dialog — no real machine, payment, or notification to real people.
  The "no cancel, unrecoverable for `holdMinutes`" behaviour is a bounded, dialog-gated,
  documented tradeoff (D-0007); enabling it by default and raising the limit to 2 does not
  change that analysis.
- **G8.** Diff contains only boolean/int config values and prose — no secrets, tokens, keys.
- **Process.** WORKLOG, DECISIONS (D-0007 amendment explicitly supersedes the "one at a
  time" framing; D-0008 note), CHANGELOG, README, CONFIGURATION all updated consistently.
  The D-0007 amendment flags the superseded prose rather than silently editing it.

### Follow-ups (done before push)

- Replaced the `docs/WORKLOG.md` "Compliance: (pending)" placeholder with the PASS verdict.
- Saved this review here.
