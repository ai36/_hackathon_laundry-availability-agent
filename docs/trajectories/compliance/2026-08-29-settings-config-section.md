# Compliance review — read-only Configuration section on Settings

**Date:** 2026-08-29
**Reviewer:** `hackathon-compliance` subagent
**Change:** New `GET /api/config` (resolved config + `overridden` dotted-path list) and
`ConfigView` — a read-only "Configuration" collapsible on `/integrator/settings` — plus
WORKLOG / CHANGELOG / DECISIONS (D-0008 amendment) / screenshot updates.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. `Laundry3Config` has no credential fields; `ANTHROPIC_API_KEY` is read from
`process.env` elsewhere and is never in `config`, so the GET cannot leak it. `paths.*` and
`agent.visionModel` are already in committed source — the endpoint exposes nothing new.
GET-only, no params, no FS access, no write path (G4). Verification re-confirmed:
`typecheck` clean, `npm test` 51/51 (G9). Eval eligibility boundary unaffected —
`laundry3.config.ts` stays the single hand-edited source, `src/agent/*` / `src/eval/*`
untouched, and the portal reads the same resolved singleton the eval imports (G2
transparency slightly improved).

### Risks (score / process) — and how they were handled

1. **Trust-boundary docstring** — `api/config/route.ts` lacked the `TRUST BOUNDARY: no auth;
   integrator-only local service (D-0016)` paragraph its five sibling routes carry (required
   by the 2026-08-28 `portal-cameras-mask-asset` review). → **Fixed:** added the same
   read-only / integrator-only / do-not-expose-publicly note to the route docstring.
2. **Compliance-workflow step** — trajectory + WORKLOG verdict line not yet in the staged
   diff. → **This file**, plus a verdict line appended to the WORKLOG entry.

### Notes

- Reviewer noted the `•` overridden marker on `site.machines.washers/dryers` (16 vs default
  12) could be misread as the live machine count. → Added a one-line caveat to the section
  copy: `site.machines.*` is a declared sanity-check, not the live roster.
- `ConfigView` shows P2-disabled groups (`reservation.*`, `agent.changeDetection.*`) —
  consistent with D-0008 ("other values are the intended production settings"); fine.
- No secrets / tokens / private data in the diff; screenshot is a regenerated UI capture.
