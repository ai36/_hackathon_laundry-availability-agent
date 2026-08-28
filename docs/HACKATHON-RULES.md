# micro1 Agentic Workflows Hackathon — Rules

Transcribed from `micro1 - First Hackathon.pdf` (source of truth). This is the reference the
compliance reviewer checks every change against.

## The challenge

Pick a specific, meaningful problem you understand. Use agents to solve it and show, through
clear evidence, that your solution improves how the task is handled today. Start by
explaining **who has the problem**, the **bottleneck** they face, and **why solving it is
valuable**. The goal is something a real person would want to use.

### Four questions to keep in mind

1. Who has this problem?
2. What bottleneck makes it worth solving?
3. Does the agent solve it well?
4. Can another person reproduce the result?

## How agents can help

Use whichever agent capabilities fit the problem: better context, better tools, memory to
carry information forward, verification to catch errors before they reach the user,
specialized skills, or orchestration across several agents. Judges focus on whether each
design choice improves the solution. **Purposeful choices matter more than the number of
components.**

## Baseline comparison

Create a simple baseline representing a reasonable basic way to handle the task before your
solution. Examples: one direct prompt with basic instructions; one general-purpose agent
with basic tools; a simple script or template; the manual process people use today.

Keep the comparison fair: same task and same evaluation cases for baseline and final
solution. Explain any meaningful difference in resources available to each.

## Improvement changelog

A short changelog telling the story of how the solution evolved, from baseline to final
result. One entry per important experiment: what was tried and why, the result using the
same evaluation method, and what was decided next. **Include experiments later removed** and
what they taught you.

| Stage | What you tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Baseline | basic approach | baseline result | Established the starting point |
| Iteration 1 | added a skill to address [issue] | new result | kept / revised / removed |
| Iteration 2 | added verification after observing [failure] | new result | kept / revised / removed |
| Iteration 3 | changed orchestration to improve [goal] | new result | kept / revised / removed |
| Final | combined the changes that worked | final result | Identified the main contribution |

## Evaluation

Choose **one primary metric** that reflects what success means to the user (tests passed,
time saved, cost reduced, calibration, ...). Define what a good final result looks like
**before** running the evaluation. Use the **same cases** for baseline and final; share the
complete results. **Ten or more cases** is a good target; include **one challenging case**
and explain what it revealed. You run the evaluation yourself. If the standard format fits
poorly, design your own clear scoring rubric and propose it.

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Primary outcome | value | value | change |
| Human time per task | value | value | change |
| Cost per task | value | value | change |

## Judging (100 points)

| Criterion | Points | What strong work looks like |
| --- | --- | --- |
| Problem & User Value | 15 | Solves a meaningful problem for a clearly defined user. |
| Agent Solution & Engineering | 30 | Uses agents purposefully and is technically sound (context, tools, memory, verification, skills, orchestration used where they help). |
| End-to-End Quality | 20 | Completes a realistic, self-contained execution; final result the user can use, with the finish of something a person would sign their name to — not an obvious AI draft. |
| Measured Improvement | 15 | Demonstrates gains over a fair baseline; changelog connects each iteration to evidence. |
| Reproducibility | 15 | Another person has a clear path to run the solution and baseline and reach the main result from a clean environment. |
| Hot Take / Insights | 5 | Turns an observed failure mode into a practical lesson for building more reliable agents. |

## Ground rules (baseline requirements for eligibility)

1. You may build with tools and components you already know.
2. Make it clear what existed before the competition and what you added.
3. Use every tool and component according to its license and service terms.
4. Keep consequential actions controlled through a sandbox or simulation. Add human
   approval before the action happens.
5. Make a qualified human reviewer part of any solution that could significantly affect
   someone.
6. Choose a legal and ethical use case that treats people and their data responsibly.
7. Use information you are allowed to share. Public or synthetic data are usually easiest;
   approved anonymous data also works.
8. Keep credentials and private information outside the submission.
9. Connect every claim about your results to the evidence you submit.
10. Give judges enough access to run the project and reproduce the main result.

## Final deliverables

1. **Complete solution code + improvement changelog.** Full project and everything required
   to run it, including the instructions that shape each agent. README introduces the
   intended user and their bottleneck and why solving it is valuable. Clearly labeled
   Improvement Changelog with one entry per meaningful iteration tied to evidence. Close
   with the main failure mode and your hot take.
2. **Reproduction guide.** Written for a clean environment: setup, exact commands for the
   solution, baseline, and evaluation. Which data is required and what output to expect.
   Relevant versions, approximate runtime and cost.
3. **Solution video** (up to ~5 minutes). Problem and baseline, one realistic execution end
   to end, the final comparison, brief changelog walkthrough, the change that contributed
   most, and one experiment you removed.
4. **Agent trajectories.** Representative trajectories for every agent used, easy to follow
   from agent instructions to final result: what the agent did, how tools responded, the
   feedback that shaped the next step, retries, and human checkpoints.
