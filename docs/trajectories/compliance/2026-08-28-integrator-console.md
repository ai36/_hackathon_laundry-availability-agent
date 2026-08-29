# Compliance reviews — 2026-08-28 — integrator console (D-0015 portal build)

Three `hackathon-compliance` subagent passes over the incremental portal work from owner
feedback. All **PASS / PASS WITH RISKS**, no eligibility blockers. Consolidated here.

## Pass 1 — 2× font + tenant/integrator page split (commit `8561221`)

- **Verdict:** PASS (pure UI refactor). `html { font-size: 200% }`, px-literal text classes
  → `text-xs`, responsive grid, `overflow-wrap`. `/` = `RoomView` (still static `○`),
  `/integrator` = `IntegratorView` (`force-dynamic`). Old `room-status.tsx` component + the
  `?role=` toggle removed. No data / eval / results change; no secrets.

## Pass 2 — Machines CRUD (commit folded into the console commit)

- **Verdict:** PASS WITH RISKS. `src/eval/roster.ts` + `/api/machines` GET/POST/PATCH/DELETE
  writing `data/machines.json` (fixed path, never id-derived; `machineId` regex-gated;
  human-initiated, git-reversible — same trust model as `/api/corrections`, not a G4/G5
  side effect). `src/eval/` does not read the roster, so `--replay` n=45 results are
  untouched.
- Risks handled: (a) trust-boundary docstring — mirrored the full `/api/corrections`
  `TRUST BOUNDARY:` paragraph into `/api/machines`; (b) reproducibility — added a
  `git checkout -- data/` reset note to `docs/REPRODUCTION.md`; (c) stale screenshots —
  regenerated after the console was complete.

## Pass 3 — Cameras CRUD + image upload (this commit)

- **Verdict:** PASS WITH RISKS. `src/eval/site-config.ts` + `data/site-config.json`
  (committed `{"cameras": []}`), `/api/cameras` CRUD, `POST /api/upload` (multipart,
  `ownerId` regex-gated, mime + 4 MB cap, target `data/site-config/` git-ignored).
  Independently re-verified: `npm test` 51/51, `check:data`, typecheck/lint/format all pass;
  secret grep clean; no new deps; eval results untouched. Upload path is pinned to
  `data/site-config/<ownerId>/<fixed-name>.<fixed-ext>` with no attacker-controlled segment;
  `../evil` → 400. Empty `site-config.json` placeholder is fine (parallels `machines.json`).
  Privacy gate correctly ignores the new JSON and still catches any force-added image.
- Risks handled: (a) **this trajectory file** (the earlier passes had no saved record —
  backfilled above); (b) `/api/upload` trusted the client mime → added a **magic-byte
  sniff** so the on-disk extension comes from the bytes, and noted the boundary in the route
  docstring.

## Standing item (unchanged, all passes)

The 9 committed eval frames have no management publish authorization — the author's own
documented risk call (D-0009 / `docs/PROBLEM.md` / `data/README.md`), reversible (`--replay`
works frames-absent). Worth a second human sign-off before final submission.

## Pass 4 — design system + auto-refresh (radix-ui, lucide-react)

- **Verdict:** PASS WITH RISKS. New deps `radix-ui` (MIT) + `lucide-react` (ISC) — permissive,
  portal-only, allowed by ground rule 1. `src/components/ui/` kit; all 3 routes rebuilt.
  Machines editor → stacked cards (adaptive). `POST /api/refresh` (Node, force-dynamic, same
  integrator-only trust boundary). Independently re-verified: `npm test` 51/51, `check:data`,
  typecheck/lint/build pass; secret grep clean; eval / n=45 results untouched;
  `data/cache/live/` git-ignored.
- Risks handled:
  1. **Dead spend** — the live classify counted results but never used them. Fixed: the live
     per-machine reads are now fused into the returned room (below D-0014 corrections).
  2. **No auto-refresh cost cap** — added `MAX_AUTO = 60` cycles, after which the toggle
     turns itself off with a note.
  3. **REPRODUCTION** — added a `/api/refresh` key-optional / cost note.
  4. Doc nits — D-0001 amendment names licenses (MIT/ISC); viewport claim standardised to
     575 px across D-0015 / WORKLOG / CHANGELOG.
