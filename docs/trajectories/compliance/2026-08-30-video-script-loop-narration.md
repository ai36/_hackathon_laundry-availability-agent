# Compliance review — `docs/VIDEO-SCRIPT.md` §3:30–4:30 narration rewrite

- **Agent:** `hackathon-compliance` (`.claude/agents/hackathon-compliance.md`), model sonnet.
- **Trigger:** the project owner (recording the video) rewrote the RU narration for the
  "Closed correction loop" section in their own voice; the compliance-load-bearing content
  was kept and rephrased. Staged, not yet committed.
- **Date:** 2026-08-30.
- **Scope reviewed:** `git diff --staged` on `dev` — `docs/VIDEO-SCRIPT.md` §3:30–4:30 RU
  text + `docs/WORKLOG.md` entry.

## Verdict: PASS WITH RISKS → both risks fixed

### BLOCKERS (eligibility)

None. No secrets in the diff. Spoken numbers (63.6 / 40.9 / 45.5) match README / CHANGELOG /
EVALUATION / REPRODUCTION / SUBMISSION and the committed `--replay` artifacts. On-screen
commands (`npm run synthesize -- --replay`, `npm run eval -- --mode=roi … --replay
--fragments`) match `docs/REPRODUCTION.md`. G9 / G10 satisfied.

### RISKS — and how each was handled

1. **Claim scoping — "обошла baseline" restated unscoped** (`docs/VIDEO-SCRIPT.md`). Prior
   compliance passes softened standalone "beat the baseline" to "cleared the baseline on
   this set" everywhere (README, CHANGELOG, EVALUATION). The scoping lived only in the
   preceding sentence.
   **Fixed:** "То есть **на этом наборе** эта автоматическая конфигурация обошла baseline."
   (one phrase, keeps the owner's cadence).

2. **Claim scoping — bare "4 из 5 на клетках, из которых правило не выводилось"** reads as
   broader generalisation than any doc claims. README / CHANGELOG / the samples artifact
   break the 4 down as 2 cue-consistency (same broken unit, different frame, same hard-error
   cue) + 2 cross-machine spillover (shared crop prompt).
   **Fixed:** restored the owner's own prior wording from commit 23adc13 — "…: та же машина
   на другом кадре и соседи по общему кропу."

### NOTES (reviewer, no change needed)

- Loop-is-built check: PASS. Present tense — "Цикл подключён к порталу… prompt fragment
  генерируется автоматически, следующий refresh распознаёт эту машину уже правильно." No
  regression to the retired "designed but not implemented" framing. Does not claim the
  portal path is itself measured (consistent with README's "operable, not measured").
- Honest-gap check: PASS. All three elements kept — all 3 corrections are `out_of_order`
  machines; 5 frames = one capture session; a later held-out set is the remaining step.
- No `DECISIONS.md` / `CHANGELOG.md` entry needed — voice re-word, no new decision or
  measured result. WORKLOG entry present and factual.
- Optional (not flagged): neither the old nor the new narration mentions the 63.6 %
  run-to-run noise (one re-run 59.1 %); README covers it separately. A one-clause mention
  would fully align the spoken segment with "read it honestly" — owner's call.
- Header timing `## 3:30 – 4:30` vs the owner's "3:35–4:35" label: ~5 s drift, kept in sync
  with surrounding cumulative timestamps. Not a compliance issue.

## Follow-up actions taken

- `docs/VIDEO-SCRIPT.md` — both scoping phrases added.
- `docs/WORKLOG.md` — verdict recorded on the narration entry.
- Committed and pushed to `origin/dev`.
