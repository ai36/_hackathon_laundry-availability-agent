# Backlog

Deferred work, newest first. Small UI-polish items live here until picked up; anything
that changes behaviour, deps, or evidence still goes through the normal
WORKLOG/DECISIONS/CHANGELOG + `hackathon-compliance` flow when done.

## Portal — button consistency + no dev ids in the UI (2026-08-28, from owner)

All four are presentational. Files: `src/components/cameras-editor.tsx`,
`src/components/machines-editor.tsx`, `src/components/machine-card.tsx`, plus a sweep for
decision ids. Verify with `typecheck` / `lint` / `build` / `format:check` + `npm test`
(51), a Chrome pass on `/integrator` and `/integrator/settings`, regenerate the three
`docs/assets/portal-*.jpg`, then run `hackathon-compliance`.

1. **Cameras editor — image `remove` becomes icon-only; camera `delete` gains a label.**
   In `cameras-editor.tsx`:
   - `ImageField`'s `remove` button (stub / annotated / mask): drop the "remove" text,
     keep just the `<Trash2 size={16}>` — use the `ICON_BUTTON` (40×40) style, keep
     `aria-label={`remove ${label}`}` and `variant="danger"`.
   - `CameraRow`'s delete-camera button (currently `ICON_BUTTON` + bare `<Trash2 size={24}>`
     + `aria-label`): add the visible word **remove** next to the icon (icon + label), so
     it reads `🗑 remove`. Drop `ICON_BUTTON`; it becomes a normal-width `variant="danger"`
     button. Keep the `aria-label` (or let the visible text be the name).

2. **Machines editor — delete button gains a `remove` label.**
   In `machines-editor.tsx` `MachineRow`: the delete button is `ICON_BUTTON` +
   `<Trash2 size={24}>` + `aria-label={`delete ${m.machineId}`}`. Make it icon + visible
   **remove** text (drop `ICON_BUTTON`, normal width, `variant="danger"`), matching the
   camera delete from item 1. Consistency across both editors.

3. **Integrator machine card — the mark-wrong panel needs a `save` + a labelled `cancel`.**
   In `machine-card.tsx` `MarkWrong`, the open panel currently only has state buttons
   (`Free` / `In use` / …) that submit immediately, plus a bare `cancel` ghost button.
   Rework to the standard form shape used elsewhere: a **save** button (primary) that
   commits the chosen correct-state + note + durable flag, and a **cancel** button as
   **icon + "cancel"** (e.g. `<X size={16}>` + text, `variant="ghost"` or `outline`) — same
   treatment as the other cancel/secondary controls. Decide whether the state buttons stay
   as instant-submit or become a selection that `save` then commits; the latter is more
   consistent (pick state → save). Keep the existing `POST /api/corrections` payload.

4. **No internal decision ids (`D-0014`, `D-0015`, `D-0016`, …) in user-facing copy.**
   Sweep the components for `D-00` in visible strings and remove/rephrase:
   - `integrator-view.tsx` — the blue info box: "…every future capture of that machine
     (D-0014)." → drop the parenthetical.
   - `cameras-editor.tsx` — panel intro + the `ImageField` labels
     ("stub image (test feed — D-0016 StaticImageFrameSource)", "annotated shot (… spatial
     key, D-0015)", "mask (black regions = ignore in analysis, D-0015)") → plain-language
     labels, no ids, no `StaticImageFrameSource`.
   - `integrator-settings.tsx` — "Source frames (N) — which frame each machine's current
     state came from" is fine; check the roster line copy.
   - `machines-editor.tsx` — none currently, but re-check.
   Keep the decision ids in code comments and docs — this is UI copy only.
