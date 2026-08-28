# Evaluation Plan

Define this before running anything, per the hackathon brief.

## Primary metric

_One number that reflects what success means for the intended user. Examples: tests passed,
human minutes saved per task, cost per task, ranking correlation, calibration error._

## Secondary metrics

- Human time per task
- Cost per task (tokens / $)
- _others as relevant_

## Cases

- Target **10+ cases**, same set for baseline and final solution.
- Include **at least one hard case** and note what it reveals.
- Data must be public, synthetic, or approved (ground rule 07).

| # | Case | Input | Expected "good" result | Notes |
| --- | --- | --- | --- | --- |
| 1 | _…_ | _…_ | _…_ | |
| … | | | | |
| N | _hard case_ | _…_ | _…_ | what it tests |

## Procedure

1. Run the baseline on all cases → record raw results.
2. Run the final solution on the same cases → record raw results.
3. Score both with the same rubric.
4. Fill the comparison table in `docs/CHANGELOG.md`.
5. Tie every claim in the report to a specific result file / test output / build log.

## Rubric

_If the metric table format fits poorly, define a scoring rubric here and propose it so
judges can apply it._

## Results

_Link to raw result files and the scored summary here as runs happen._
