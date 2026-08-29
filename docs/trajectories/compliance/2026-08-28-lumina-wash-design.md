# Compliance review — "Lumina Wash" portal design pass

**Date:** 2026-08-28
**Reviewer:** `hackathon-compliance` subagent
**Change:** Pure front-end design pass on the portal — adopt the owner-supplied "Lumina
Wash" reference design (`docs/design-reference/`). `globals.css` token set as Tailwind v4
`@theme` vars (single dark theme; removed `prefers-color-scheme` swap + `html { font-size:
150% }`), `Inter` via `next/font/google`, new `src/components/ui/app-shell.tsx` nav shell
(left rail / bottom bar → the 3 existing URL routes), className-only restyle of the UI kit +
views, regenerated screenshots, doc updates (D-0001 2nd amendment, WORKLOG, CHANGELOG),
newly-tracked `docs/design-reference/`.

## Verdict: PASS WITH RISKS

### Blockers (eligibility)

None. No eval-harness, committed-frames, `--live`, or data-model code touched. Diff grep for
keys / tokens / secrets is clean. `docs/design-reference/*/code.html` reference
`cdn.tailwindcss.com` / `unpkg.com/lucide` script tags, but these are static owner-supplied
mockups in `docs/` — never built or served by Next.js — so no runtime / license exposure.
Inter is served via `next/font/google` (same mechanism already used for Geist; Google Fonts
is the one allowed web-font host per `docs/design-reference/README.md`). Provenance
("owner-supplied reference") is stated in WORKLOG, DECISIONS (D-0001 2nd amendment), and
CHANGELOG; `README.md` "What existed before the hackathon" section still stands.

### Risks (score / process) — and how they were handled

1. **Stale doc claim — `README.md` "root font 150%".** The change removes `html { font-size:
   150% }`. → **Fixed:** `README.md` portal paragraph rewritten to describe the Lumina Wash
   system (single dark theme, Inter, px type scale, nav shell). `docs/DECISIONS.md` D-0015
   body lines carrying the same "font 150%" wording got a "superseded — see D-0001 2nd
   amendment" pointer.
2. **No saved evidence for the responsive claim.** WORKLOG / CHANGELOG asserted a 486 px
   Chrome check with no reproducible snippet. → **Fixed:** the exact DevTools console
   snippet (overflow + non-scroll-container offender enumeration) and its result
   (`{ overflow: false, offenders: 0 }` on all three pages) are now pasted into the WORKLOG
   entry.

### Notes

- CHANGELOG entry correctly filed under "Verification runs", not the Improvement Changelog —
  no primary-metric change is claimed.
- `app-shell.tsx` nav items map 1:1 to existing routes — consistent with the prior
  "URL routing, no mode toggle" decision; no new undocumented design decision.
- Verification claims (`typecheck` / `lint` / `build` / `format:check`, `npm test` 51/51,
  `check:data`) were not re-run by the reviewer; taken as stated per task scope.
