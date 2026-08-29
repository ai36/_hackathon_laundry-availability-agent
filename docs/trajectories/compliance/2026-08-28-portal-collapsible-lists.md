# Compliance review — portal collapsible lists, tenant summary, editor rows, icons

**Date:** 2026-08-28
**Reviewer:** `hackathon-compliance` subagent
**Change:** Front-end-only portal changes across several owner requests, staged since
`458949c` (10 components + 3 docs + 3 regenerated screenshots).

- `MachineGrid` → new `collapsible` prop (disclosure `<button>` with `aria-expanded` /
  `aria-controls`, grid mounted behind `hidden`); heading always shows the item count.
  Enabled on `/tenant` and `/integrator`.
- Tenant status card leads with `Washers free N / 16` + `Dryers free N / 16` big figures;
  `in use · out of order · unknown` demoted to one small line.
- Settings: "Machines (32)" split into collapsible `Washers` / `Dryers` (`RosterSection`,
  type-fixed add row); "Site overview" made collapsible. Four collapsible sections.
- Editor cards restructured — fields → text field → dedicated `save` + delete action row
  (removes the `ml-auto` group that orphaned a right-aligned second line on narrow
  screens).
- `Button` base `min-h-9`→`min-h-10` (40px); new `ICON_BUTTON` export (40×40); delete glyph
  14→24px; inline glyphs 14→16; `Section` chevron 16→18.
- Camera-id placeholders `cam-1`→`C-01` + a convention note; `SITE_ID_RE` unchanged.

## Verdict: PASS (APPROVED)

### Blockers (eligibility)

None. No secrets in the diff. No dependency, license, data-model, API, `data/`, or `--live`
changes — the editor write endpoints (PATCH/POST/DELETE), their `confirm()` gates, and the
integrator-only portal are untouched. G2 before/after boundary unaffected (presentational
only).

### Risks (score / process)

None blocking. Process hygiene satisfied: WORKLOG top entry, D-0001 amendment, and a
CHANGELOG verification-runs row all cover the change; the amendment explicitly retires the
stale "~36px" target line, closing the "docs don't match code" risk from the prior review.

### Notes (addressed)

- Reviewer flagged the `MachineGrid` chevron staying at `size={14}` while the amendment
  bumps the `Section` chevron to 18 and called them "the same model". → The D-0001
  amendment wording was tightened to say the shared thing is the disclosure *mechanism*
  (button + `aria-expanded`/`aria-controls` + `hidden` body), and to note the chevron is
  deliberately smaller because the grid heading is a `text-xs` label, not the `text-base`
  `Section` title.
- Verification claims recorded but not backed by pasted command output — matches the
  established pattern for infra entries in this repo; no test/spec files changed.
- Screenshots are synthetic-data portal captures — no private/scraped content.
