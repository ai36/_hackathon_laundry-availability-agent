# Compliance review — portal visual-rhythm + WCAG 2.2 pass

**Date:** 2026-08-28
**Reviewer:** `hackathon-compliance` subagent
**Change:** Front-end-only pass on the portal, driven by the connected `web-design-guidelines`
skill (Vercel Web Interface Guidelines). 23 files: `src/components/**`, `src/app/globals.css`,
`src/app/layout.tsx`, new `src/components/ui/link-button.tsx`, docs. One spacing scale applied
uniformly; every interactive control ≥36 px; `Switch` gains a required `label`→`aria-label`;
`LinkButton` removes `<a><button>` nesting; decorative icons `aria-hidden`; `Section`
`aria-expanded`/`aria-controls`; `AppShell` skip-link + labelled navs + safe-area;
`prefers-reduced-motion` + `touch-action` in CSS; `theme-color`; `role="alert"` on errors;
`autocomplete`/`spellCheck` on code inputs.

## Verdict: PASS

### Blockers (eligibility)

None. No secrets/tokens in the diff. No data, scraping, license, or credential concerns —
Radix / lucide / `web-design-guidelines` were already in use. No agent, `--live`,
approval-gating, or eval-harness code touched. Attribution present in WORKLOG, CHANGELOG,
DECISIONS (D-0001 3rd amendment), and SKILLS.

### Risks (score / process) — and how they were handled

1. **"No logic change" overstated.** `src/components/ui/section.tsx` moved from conditionally
   rendering collapsed children (`{(!collapsible || open) && body}`) to always mounting them
   behind a `hidden` attribute (needed so `aria-controls` points at a live element). Benign
   and a11y-motivated, but collapsed `MachineRow` / `CameraRow` subtrees now mount. →
   **Fixed:** the claim in WORKLOG / DECISIONS / CHANGELOG now reads "no business-logic /
   API / data-model change; one Section render change for `aria-controls`".
2. **a11y verification asserted, not captured.** `npm test 51/51` is repeatable but the
   browser checks were not tied to an artifact. → **Fixed:** the exact DevTools console
   snippet and its output (skip-link text, both nav `aria-label`s, `prefers-reduced-motion`
   rule present, `#main` exists) are pasted into the CHANGELOG "Verification runs" entry.

### Notes

- `Switch` `label` becoming required is a breaking prop change; the only caller
  (`refresh-control.tsx`) passes it and `typecheck` would catch a miss — consistent.
- `LinkButton` correctly removes the `<a><button>` nesting (WCAG 4.1.2); shared
  `buttonClasses()` keeps styling in one place.
- CHANGELOG entry filed under "Verification runs", not the Improvement Changelog table —
  correct: this pass does not touch the primary metric or baseline.
