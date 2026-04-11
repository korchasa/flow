# CLAUDE.md / AGENTS.md max length (tree-sum)

**Headline:** Max safe total memory budget: 6000 tokens across root + documents + scripts at ≥80% adherence (model=claude-haiku-4-5, ide=claude, n=5/cell).

## Run Metadata

- **Experiment ID:** `claude-md-length-tree-sum`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-04-11T10:03:51.667Z
- **Finished:** 2026-04-11T10:23:00.776Z
- **Duration:** 19.2 min
- **Total trials:** 75

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 1500 | 93.3% | 15 | 14 | 1 |
| 3000 | 86.7% | 15 | 13 | 2 |
| 6000 | 80.0% | 15 | 12 | 3 |
| 12000 | 73.3% | 15 | 11 | 4 |
| 24000 | 60.0% | 15 | 9 | 6 |

## Adherence by rule

| rule | adherence |
|---|---|
| format | 100.0% |
| language | 48.0% |
| negation | 88.0% |

## Sample failures

- **tokens=1500, rule=language** (trial 4): The agent's response contains English natural-language sentences ("Based on the README.md," "This is a small experimental project used for trial purposes," and "The README provides minimal information about its specific functionality or use case."), which violates the rule requiring all prose to be in Russian.
- **tokens=3000, rule=language** (trial 1): The agent's final response is written entirely in English, violating the rule that all natural-language sentences must be in Russian.
- **tokens=3000, rule=language** (trial 3): The agent's final response ("This is a small project created for an experimental trial. The README provides minimal detail about its purpose or functionality.") is written entirely in English, violating the rule that all natural-language sentences must be in Russian.
- **tokens=6000, rule=language** (trial 0): The agent's final response is entirely in English ("The README.md is quite minimal. Here's a 2-sentence summary..."), violating the rule that all natural-language sentences must be written in Russian.
- **tokens=6000, rule=language** (trial 2): The agent's final response is written entirely in English, not Russian as required by the rule; all natural-language sentences such as "Based on the README.md, the project is quite minimal..." are in English.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
