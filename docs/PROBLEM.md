# Problem & User Value

Status: **v1, from the 2026-08-28 scoping interview.** Open questions are listed at the end.

## Who has the problem?

A person renting an apartment in an apartment complex that has a **shared laundry room**
(~20–30 machines, roughly half washers and half dryers), who wants to do a load of laundry.

## What is the bottleneck?

Today the tenant:

1. Gathers a full bag of laundry.
2. Carries it to the laundry room.
3. Often finds **every machine occupied**.
4. Carries the bag back to the apartment, waits an unknown amount of time, and tries again —
   physically hauling the laundry on every attempt.

There is no way to know machine availability **before** making the trip, and no way to hold
a machine for the few minutes it takes to walk over.

## Why is solving it valuable?

It removes wasted trips and the physical effort of carrying laundry back and forth, and
lets the tenant time the trip to when a machine is actually free. For the building it means
better-utilised machines and fewer complaints.

## The solution (product vision)

Cameras in the laundry room → an **agent** determines the status of each machine
(free / occupied) → a portal shows availability ahead of time → the tenant can **reserve** a
free machine for ~5 minutes to walk over.

Production model: a service company installs cameras + a server and runs a **calibration**
pass where a human confirms the agent's status decisions, which the agent uses to build a
per-site config.

## Scope

### In scope (hackathon)

- **P0 (must work by the deadline):**
  - Calibration step: from a handful of human-confirmed labelled frames, the agent derives a
    **per-site config** — per-machine ROIs, reference crops for free/occupied, few-shot
    exemplars, thresholds. No model fine-tuning.
  - Runtime step: given a frame (+ prior state), the agent produces a **verified per-machine
    status list** with a state, a confidence, and a short rationale — using a multi-step
    graph with an explicit verification pass.
  - Evaluation harness + labelled dataset + scoring script.
  - Baseline: single vision-model prompt on the whole frame.
  - `--replay` mode: re-run scoring from cached model responses, no API key, no cost.
- **P1 (if time):** change-detection vs the previous frame (skip unchanged ROIs to save
  tokens); cycle timers / "machine will free up in ~X min"; abandoned-laundry detection.
- **P2 (if time):** reservation flow; user notifications.

### Out of scope (hackathon)

- Real camera/server hardware integration.
- The mobile app / deep integration with the apartment complex's app (portal is a simple
  read page served by Next.js).
- Model fine-tuning.
- Handling calibration drift when machines are replaced or a camera moves (documented as a
  known limitation).

### Reservation logic (simple, P2)

User picks a free machine → it is marked occupied for 5 minutes → after 5 minutes the system
re-checks the real status: if occupied, keep it; if still free, mark it free again on the
portal. Guard rail: a user cannot reserve **all** machines at once. A user arriving and
using a different machine that is actually free but was never reserved does not break the
system.

### Consequential actions (ground rule 04)

The only outward action is a soft 5-minute reservation on a portal — reversible, low impact,
and simulated in the hackathon build. No hardware is actuated. A reservation auto-expires.

### Human reviewer (ground rule 05)

A qualified human is in the loop during **calibration**: they confirm/correct the agent's
per-machine status decisions before the per-site config is accepted.

**Runtime review decision (hackathon):** the portal is **calibration-reviewed only**, with
no per-frame human checkpoint at runtime. Rationale: a wrong "free" assertion is low harm —
it reproduces today's wasted trip and nothing worse — no hardware or money moves. The portal
shows a per-machine **confidence** and a "confirm on arrival" caveat. A runtime
human-review / flag-low-confidence queue is noted as a production path, out of scope for the
submission. (Override this decision here if the harm assessment changes.)

### Data (ground rule 06 / 07 / 08)

Source: the author's own / a friend's real shared laundry room, shot at different times of
day, plus a short time-ordered series. Handling:

- Shoot with **no people present**; frame tightly on the machine faces / indicator panels.
- **Exclude or blur other tenants' belongings** — baskets, carts, bags, clothing left on or
  near machines. Prefer frames with the room clear of third-party items; where that is not
  possible, crop to the machine faces so personal items are out of frame.
- Blur or exclude any incidental person, apartment numbers, notices with names, or other
  identifying details.
- Written authorization from whoever manages the laundry room that **explicitly covers
  filming the common area for this purpose**. This does not extend to other tenants'
  belongings — hence the exclusion rule above.
- Frames containing a recognisable person are **not** included in the shared dataset; the
  "person in frame" hard case is covered with a synthetic/augmented frame instead, and the
  augmentation source (fully synthetic, or a licensed/own image) is recorded next to that
  frame.
- No credentials or private info in the repo; `ANTHROPIC_API_KEY` stays in the environment.

## The four questions (hackathon rubric)

1. **Who has this problem?** — Apartment-complex tenants using a shared laundry room.
2. **What bottleneck makes it worth solving?** — No advance visibility of machine
   availability; wasted trips carrying laundry back and forth.
3. **Does the agent solve it well?** — Measured on a labelled frame set vs. a single-prompt
   baseline: primary = per-machine state accuracy (`free`/`occupied`/`unknown`) over
   determinate ground truth; secondary = harmful-error rate (false `free`/`occupied`) and
   coverage — the agent should make fewer harmful errors by abstaining (`unknown`) instead
   of guessing. Includes hard cases (angle, glare, low light, `lights_off_no_motion`,
   partial indicator, mixed washer/dryer indicator styles, person in frame).
4. **Can another person reproduce the result?** — Dataset, labels, cached model responses,
   agent trajectories, and the scoring script are in the repo; `--replay` reproduces the
   scored number with no API key.

## Machine state space

Per machine, per frame: **`free` | `occupied` | `unknown`**. `unknown` = the agent cannot
determine the state from the available evidence (indicator blocked by a person, lights off,
severe glare). Abstaining with `unknown` is the correct behaviour when the evidence is not
there — the portal shows "unknown — check on arrival", which is honest and strictly better
than a false "free". (`out_of_order` may be added later; out of scope now.)

`unknown` is a property of the **observation**, not the machine. Transient real-world
conditions (a person blocking one machine's indicator, evening light, a motion-sensing lamp
switching the room dark) are recorded per frame / per machine-observation, never baked into
a machine's identity — see the label format below.

## Primary metric

**Overall per-machine state accuracy** across the labelled evaluation frames: correct
predictions ÷ machine-observations whose ground truth is determinate (`free`/`occupied`). An
agent `unknown` on a determinate ground truth counts as **incorrect** (no answer given).

Secondary:

- **Harmful-error rate** — (false `free` + false `occupied`) ÷ total. Abstaining is *not*
  harmful. The agentic layers should push this down by abstaining instead of guessing.
- **Coverage** — determinate predictions ÷ total; plus accuracy-on-covered.
- Tokens / cost per frame; human time per task (context only).

## Label format

One JSON object per frame:

```json
{
  "frame_id": "2026-08-28T18-40-00_camA",
  "timestamp": "2026-08-28T18:40:00-07:00",
  "camera": "A",
  "frame_conditions": ["low_light", "lights_off_no_motion"],
  "machines": [
    {
      "machine_id": "W-03",
      "type": "washer",
      "bbox": [x, y, w, h],
      "state": "occupied",
      "gt_determinate": true,
      "observation_notes": ["indicator_occluded_by_person"]
    }
  ]
}
```

- `frame_conditions` — frame-wide, list, may be empty. Vocabulary (extensible): `low_light`,
  `lights_off_no_motion`, `glare`, `backlit`, `motion_blur`, `person_in_frame`,
  `partial_view`.
- `state` — the **ground-truth** state, decided by the human labeller using whatever context
  they have (adjacent frames, knowledge of the room).
- `gt_determinate` — `false` only when even a human cannot tell from the available evidence;
  those observations are excluded from the primary-accuracy denominator and reported
  separately.
- `observation_notes` — per-machine, optional, list. Vocabulary (extensible):
  `indicator_occluded_by_person`, `indicator_occluded_by_object`, `indicator_partial`,
  `glare_on_door`, `door_open`, `ambiguous`.

You can hand the labels over in any form (even prose per frame); they get normalised to this
schema.

## Open questions

- Number of time-ordered frames and the interval between them.
- Where the portal is hosted for the demo (is local `next start` enough?).
- Format of the 5-minute video (decided closer to the deadline).
