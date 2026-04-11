# CLAUDE.md / AGENTS.md max length (single file)

**Headline:** Max safe AGENTS.md size: 1000 tokens at ≥80% adherence (model=claude-haiku-4-5, ide=claude, n=5/cell).

## Run Metadata

- **Experiment ID:** `claude-md-length-single-file`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-04-11T10:03:35.035Z
- **Finished:** 2026-04-11T10:27:12.712Z
- **Duration:** 23.6 min
- **Total trials:** 90

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 500 | 86.7% | 15 | 13 | 2 |
| 1000 | 86.7% | 15 | 13 | 2 |
| 2000 | 73.3% | 15 | 11 | 4 |
| 4000 | 66.7% | 15 | 10 | 5 |
| 8000 | 73.3% | 15 | 11 | 4 |
| 16000 | 80.0% | 15 | 12 | 3 |

## Adherence by rule

| rule | adherence |
|---|---|
| format | 100.0% |
| language | 40.0% |
| negation | 93.3% |

## Sample failures

- **tokens=500, rule=language** (trial 1): The agent's final response ("This is a small project created for an experiment trial. The README provides minimal information beyond stating its experimental nature.") is written entirely in English, violating the rule that all natural-language prose must be in Russian.
- **tokens=500, rule=language** (trial 4): The agent included a parenthetical with natural-language sentences in English ("The README.md is minimal and doesn't provide much detail about what the project actually does — it only describes itself as 'a small project used for an experiment trial.'"), which violates the rule that all natural-language prose must be in Russian.
- **tokens=1000, rule=language** (trial 0): The agent's final response is entirely in English ("Based on the README.md, here's a 2-sentence summary: This is a small project created for an experimental trial. The README provides minimal detail about the project's specific purpose or functionality."), violating the rule that all natural-language sentences must be written in Russian.
- **tokens=1000, rule=language** (trial 4): The agent's final response is written entirely in English ("This is a minimal experiment trial project. The README provides no additional context..."), violating the rule that all natural-language sentences must be in Russian.
- **tokens=2000, rule=language** (trial 0): The agent's final response is written entirely in English ("The README indicates this is a small project created for an experimental trial. It doesn't provide further details about the specific functionality or purpose of the project."), violating the rule that all natural-language sentences must be in Russian.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
