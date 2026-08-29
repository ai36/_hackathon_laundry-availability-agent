# Design reference

Drop reference designs for the portal here — mockups, screenshots, a Figma export, a style
sheet, colour tokens, whatever you have. I'll match the portal (`src/components/ui/` +
`src/app/globals.css`, the `/tenant` and `/integrator*` pages) to what lands here.

## What's useful

- **Screens / mockups** — `png` / `jpg` / `webp` / `svg`, or a `pdf`. Name them for the
  screen: `tenant.png`, `integrator.png`, `settings.png`, `mobile-tenant.png`, …
- **Tokens** — colours, spacing, radii, font sizes, either as an image or a small
  `tokens.md` / `tokens.json`.
- **Type** — the font family (and a Google Fonts name if it's on there — that's the only
  web-font host the build allows).
- **Components** — button / input / card / toggle states if the mockups show them.
- **Notes** — a `notes.md` with anything the images don't say (dark mode? density? motion?).

## How it gets used

The portal already has a small kit — `PageShell`, `Button`, `Section`, `field`, `switch`
(D-0001 amendment, `docs/SKILLS.md` lists the Vercel `web-design-guidelines` skill used to
review it). Reference here drives:

1. `globals.css` — CSS variables (background / foreground / accent), `html { font-size }`.
2. `src/components/ui/*` — the variant classes.
3. Per-page layout tweaks in `src/components/room-view.tsx` / `integrator-view.tsx` /
   `integrator-settings.tsx`.

## Notes

- Big source files (`.fig`, multi-hundred-MB PSDs) can stay on your machine — a flat
  export is enough. Keep committed images reasonably sized.
- This folder is **not** git-ignored, so anything you add here is committed with the repo
  unless you say otherwise.
