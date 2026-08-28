# Reproduction Guide

Written for someone starting from a clean environment.

## Prerequisites

- **Node.js** 24.x (developed on 24.11.1). Enforced by `package.json` `engines` and
  `.nvmrc` (`nvm use` picks it up). Check with `node --version`.
- **npm** 11.x (ships with Node 24).
- Git (optional, for cloning).
- OS: developed on Windows 11; the stack is cross-platform.

## Setup

```bash
# from the project root
npm ci
```

`npm ci` installs the exact versions in `package-lock.json`. Do not use `npm install` for
reproduction — it may resolve newer versions.

**Approximate runtime / cost (infra bootstrap stage, 2026-08-28):**

| Step | Wall time | Notes |
| --- | --- | --- |
| `npm ci` | ~20–30 s | ~370 packages, no native builds |
| `npm run build` | ~5 s | Next.js 16 + Turbopack, warm cache |
| `npm run typecheck` / `lint` | ~1–2 s each | |
| Cost | $0 | no paid APIs used yet |

## Run the app

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint (flat config)
npm run format:check # prettier
```

## Agent skills

The agent workflow uses two skills (details in `docs/SKILLS.md`):

```bash
# already installed globally for this environment; to reinstall elsewhere:
npx skills add jekudy/grillme-skill@grillme -g -y
```

`find-skills` is part of the base Claude Code skill set (uses `npx skills find`).

## Baseline

_TBD — exact command(s) to run the simple baseline on the evaluation cases._

## Evaluation

_TBD — exact command to score baseline and final on the shared cases. See
`docs/EVALUATION.md`. Record expected output, approximate runtime, and cost._

## Expected output

_TBD — what a successful run prints / produces._
