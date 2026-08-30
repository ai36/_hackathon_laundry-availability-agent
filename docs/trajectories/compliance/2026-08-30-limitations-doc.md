# Compliance review — `docs/LIMITATIONS.md` (new)

- **Agent:** `hackathon-compliance` (`.claude/agents/hackathon-compliance.md`), model sonnet.
- **Trigger:** new consolidated "Compromises & conventions" doc + pointer rows in
  `README.md` / `docs/SUBMISSION.md` + `docs/WORKLOG.md` entry. Staged, not yet committed.
- **Date:** 2026-08-30.
- **Scope reviewed:** `git diff --staged` on `dev` — `docs/LIMITATIONS.md` (new, five grouped
  tables), 1 README doc-table row, 4 lines in `docs/SUBMISSION.md`, 1 WORKLOG entry.

## Verdict: CHANGES REQUIRED → all fixes applied

### BLOCKERS (eligibility)

None. Prose-only diff, no secrets. G2 improves before/after clarity. G4 / G5 / G7 / G8
posture unchanged from D-0007 / D-0009 (accepted in prior passes); consolidating the
"no management authorization" disclosure into one place is net-positive honesty, not a new
violation. Item explicitly checked: stating the reservation-simulation and
calibration-only-review plainly in one place exposes **no latent blocker** — the hold is
reversible, auto-expiring, in-repo, with no outbound channel; runtime review is
calibration-time per the documented low-harm assessment.

### RISKS — and how each was handled

1. **[MUST-FIX — false, contradicted `docs/EVALUATION.md`]** "Config & architecture" row 1
   claimed `src/eval/*` never reads `data/site-config.json` and that "editing a camera in
   the portal does **not** move an eval number". In fact `scripts/run-eval.ts` +
   `src/eval/calibration.ts` load the **committed** `data/site-config.json` for per-camera
   `machineIds` scoping in **every** mode, and `--mode=roi` also reads `mask` / `maskLegend`
   from it. The `pipeline.ts` shape-sniff only neutralises the never-produced `--mode=agent`
   calibration shape.
   **Fixed:** row rewritten — the eval reads only *committed* inputs (static `config`,
   `data/machines.json`, `data/corrections/`, committed `data/site-config.json`); it never
   reads the *git-ignored* runtime layers `data/config-overrides.json` /
   `data/reservations.json`; editing a camera in the portal *does* rewrite the committed
   `data/site-config.json` and would re-scope a later eval, but that file is
   version-controlled so it shows in `git status`. "Why acceptable" now claims only that the
   git-ignored layers cannot perturb a clean-checkout replay.

2. **[MUST-FIX — contradicted `docs/EVALUATION.md:94-96`]** "Evaluation set" row 1 listed
   "glare, low light" among the hard cases present; those are under "Not yet built".
   **Fixed:** reworded to the cases actually in the 5 frames — hard-error / taped-off
   displays (5 of 22 obs, deliberately over-represented), small worn 7-segment readouts in
   wide angled shots, near-full / near-empty occupancy, two-camera overlap on D-01 / D-02;
   added a parenthetical that glare / low-light / person-in-frame are "Not yet built".

3. **[MUST-FIX — present-tense claim about a not-built case]** "Data" row 2 read as if the
   person-in-frame synthetic case exists.
   **Fixed:** restated as a rule for a not-yet-built case — no frame with a recognisable
   person is in the dataset today; if the case is added it will use a synthetic frame with
   the augmentation source recorded beside it.

4. **[SHOULD-FIX — overstated]** "Config & architecture" last row implied both dead-ends are
   `--replay`-runnable. Only `--mode=calibrated` is (`data/cache/calibrated/` committed).
   The verification pass's cache was removed in the 2026-08-29 recut; its −4.4 pp is a
   **retired 9-frame-set** number; evidence is the historical report.
   **Fixed:** the two are split — calibrated = runnable, cache committed; verification pass =
   retired, config-gated off (`agent.verification.enabled=false`), evidence is
   `docs/artifacts/historical/` + `docs/trajectories/runtime/2026-08-29-verification-pass-retired.md`.

5. **[NOTE — minor]** "write routes have no authentication" named 5 routes; `PATCH
   /api/config` and `POST /api/reservations` are also unauthenticated writers.
   **Fixed:** both added to the list.

6. **[NOTE — minor]** "`StaticImageFrameSource` is also the permanent … fixture" describes
   D-0016 design intent; no such class exists.
   **Fixed:** "(planned, D-0016)" added; the row now also says "no such class exists yet,
   only docstrings".

7. **[process — done]** Save this review + record verdict/fixes in WORKLOG before pushing.
   **Done:** this file + WORKLOG entry updated.

### Process items the reviewer confirmed OK

- No `docs/DECISIONS.md` entry needed — this consolidates D-0007 / D-0009 / D-0014 / D-0015 /
  D-0016, it is not a new decision.
- No `docs/CHANGELOG.md` row needed — no measured result / iteration.
- The `docs/WORKLOG.md` entry is present and adequate.

### NOTES (verified accurate, no change)

- 17 of 32 machines covered (distinct ids across the 5 cameras = W-01..04, D-01..10,
  W-14..16); roster 16 + 16.
- All 3 corrections are `machine`-scope `out_of_order` (W-04, D-02, D-06).
- "1 of 5 fixes in-sample"; "one committed sample per config + 2 non-reproducible re-runs".
- No Dockerfile / compose / `snapshot.json` / `FrameSource` impls exist (only docstrings).
- `/api/upload` has `kind=machine-reference` with no editor UI.
- Numbers (45.5 / 63.6 / 68.2 %, n = 22, −13.7 pp, −4.4 pp) consistent with README /
  CHANGELOG / EVALUATION; no contradictory figure introduced beyond the mis-scoped claims
  fixed above.
- The D-0016 acceptance-bar paraphrase is faithful.

## Follow-up actions taken

- `docs/LIMITATIONS.md` — items 1–6 above applied.
- `docs/WORKLOG.md` — entry phrasing corrected (item 1) + this verdict recorded.
- Committed and pushed to `origin/dev`.
