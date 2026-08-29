# Compliance review — tenant machine reservations

**Date:** 2026-08-29
**Reviewer:** `hackathon-compliance` subagent
**Change:** Live status — tap a free machine → confirm dialog → short auto-expiring hold.
New `src/portal/reservations.ts` + `client-id.ts`, `POST/DELETE/GET /api/reservations`,
`ConfirmDialog` (Radix `AlertDialog`), `buildRoomStatus` overlay, `/tenant` → `force-dynamic`.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. G4: the confirm dialog is the human checkpoint; the hold is reversible (`DELETE`) and
auto-expires; no real-world outbound side effect (D-0007 keeps SMS/locks out of scope). G3:
`radix-ui` `AlertDialog` is an already-approved dep. G8: no secrets; `client-id.ts` makes a
random non-PII id. Default `reservation.enabled: false` — no behaviour change unless the
integrator opts in. **Eval decoupling confirmed:** `git grep reservation -- src/agent
src/eval` is empty; `buildRoomStatus`'s new param defaults to `[]`; `data/reservations.json`
is git-ignored and absent from disk; `git status data/` clean.

### Risks (score / process) — all fixed before push

1. **`README.md` contradicted shipped code** — L66 "No API call, so it prerenders", L81
   "Reservations … P2, not wired", the `/tenant` image alt text. → **Fixed:** the `/tenant`
   bullet now describes the reserve/release control + per-request rendering; the "P2" line
   now says reservations are wired (off by default, pre-emption reconciliation still P2);
   alt text updated.
2. **Per-user cap is best-effort** — `maxActivePerUser` keys on a client-supplied
   localStorage `by`, so id rotation bypasses it; only `maxReservedFractionOfFree` is a
   real backstop. → **Fixed:** the D-0007 amendment now states this plainly ("best-effort,
   not a lock") and names the fraction cap as the real backstop, consistent with the
   decision's "advisory, not a lock" stance.
3. **Unlocked read-modify-write** on `data/reservations.json` — concurrent POSTs can drop a
   write / slightly overshoot the fraction cap. → **Fixed:** a docstring in
   `reservations.ts` records the assumption (fine at laundry-room rates, self-correcting via
   expiry, advisory per D-0007; a real deployment uses a single-writer store).

### Notes

- Trust boundary matches peer routes (`no auth; local / on-prem, D-0016`), correctly drops
  "integrator-only" since it is tenant-facing, and is strictly less sensitive (writes only
  the ephemeral git-ignored file).
- `force-dynamic` on `/tenant`: no documented build-output/route-table reproduction step is
  broken; the README edit is the only doc fix.
- Docs trail complete: WORKLOG, CHANGELOG (infra row, no metric claim), DECISIONS D-0007
  amendment, REPRODUCTION (test count 56→61, restore command + console-writes note include
  `data/reservations.json`).
