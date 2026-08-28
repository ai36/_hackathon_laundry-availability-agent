# Compliance review — reservations reframed as advisory

- **Agent:** hackathon-compliance (`.claude/agents/hackathon-compliance.md`)
- **Trigger:** staged docs-only change — reservation is a hint not a lock; camera is
  authoritative; walk-in pre-emption handling (D-0007, PROBLEM.md reservation section,
  EVALUATION S3, WORKLOG)
- **Input:** `git diff --staged` (prose only)
- **Date:** 2026-08-28
- **Model:** sonnet

## Result

**Verdict: PASS WITH RISKS**

### Blockers (eligibility)
- None. G4 strengthened — reservation is explicitly a hint, camera-authoritative, 5-min
  auto-expiry, simulated, no hardware. G9 — the "Known limitation" paragraph and D-0007's
  "not a per-trip guarantee" are honest, no overclaim. G8 — prose only. Metric separation
  (reservation-honoured rate, simulation-only, P2, never mixed with P0 accuracy) consistent
  across all four files.

### Risks (score / process)
1. G4 scope: D-0007 / PROBLEM.md say the user is "notified" / "told", but the unchanged
   consequential-actions line says "the only outward action is a soft reservation on a
   portal" → state that the pre-emption notice is portal state on the existing read page,
   not a new outbound channel; a real push/SMS/email would need its own sandbox/approval.
2. EVALUATION heading: S3 added as "(P2)" under "### P1 sequence cases (only if P1 is
   built)" → rename heading or give P2 its own subsection.
3. Drop-rule ambiguity: "If P1/P2 are not built, S1–S3 are dropped" doesn't cover P1-built,
   P2-not → reword so the two are independent.

### Notes
- "before they waste the trip" assumes the user re-checks the portal before leaving — make
  that assumption explicit.
- D-0007 framing reconciliation as a concrete job that justifies an agent over a single
  classifier call — useful support for the Agent Solution & Engineering criterion.
- Process hygiene satisfied (WORKLOG + D-0007). No CHANGELOG row expected.

## Follow-up actions taken

Same commit: pre-emption notice reworded everywhere as portal state on the existing read
page, with an explicit "a real outbound channel is a separate consequential action" note in
PROBLEM.md (reservation section + consequential-actions section) and D-0007; EVALUATION
heading → "P1 / P2 sequence cases" with a per-row Tier column and independent drop rules;
added the "only helps a user who re-checks the portal" caveat to the Known limitation.
