# Compliance review — reservation mechanic rework

**Date:** 2026-08-29
**Reviewer:** `hackathon-compliance` subagent
**Change:** Rework the tenant reservation mechanic (commit `f4d11eb`) per owner feedback —
a held machine reads `occupied` to everyone, no `DELETE`/cancel, one hold per user, only
free cards interactive. `src/portal/room-status.ts`, `src/components/{room-view,machine-card}.tsx`,
`src/app/api/reservations/route.ts` + docs. No new files.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. G4 holds without `DELETE`: the reservation is portal-only / simulated (D-0007 keeps
SMS/locks/hardware out of scope), the Radix confirm dialog is still the pre-action human
checkpoint, the feature is off by default (`reservation.enabled: false`), and a hold
self-reverses via the `holdMinutes` auto-expiry. G4 needs a pre-action gate + bounded blast
radius, not a guaranteed undo. The dialog copy now discloses "You can't cancel it or move
it" before consent.

### Risks (score / process) — all fixed before push

1. **Mis-click cost** — a wrong confirm holds the machine for the full `holdMinutes`
   (default 5), reads "In use" to others, and blocks the owner from any other hold. → Not
   changed (owner-requested), but the D-0007 amendment now names it an **accepted tradeoff**
   and points at the short window + the dialog disclosure as the mitigation.
2. **Evidence (G9)** — the CHANGELOG row asserted curl/browser checks with no trajectory.
   → **This file** records them.
3. **`release()` has no caller** — a reader of `route.ts` would wonder why. → **Fixed:** the
   `release()` docstring in `reservations.ts` now says "No route exposes this — deliberate
   (D-0007 no-cancel); kept as a tested primitive for a future admin / expiry-sweep tool."

### Notes

- Eval decoupling intact: `git grep -i reserv -- src/agent src/eval` empty;
  `buildRoomStatus`'s `reservations` param defaults to `[]`; only `src/app/tenant/page.tsx`
  and the reservations route pass holds — the `occupied` flip is tenant-only. `/integrator`,
  `/api/room`, `/api/corrections`, `/api/refresh` call `buildRoomStatus` with no holds.
- `POST` guard changes are safe: per-`by` cap moved ahead of the availability check (only
  changes which 409 wins); `enabled` 403, id 400, fraction cap unchanged; the dropped
  explicit `target.reserved` 409 is subsumed by `state !== "free"` (a held machine reads
  occupied).
- `data/reservations.json` git-ignored; `git status` clean under `data/`. No secrets in the
  diff.
