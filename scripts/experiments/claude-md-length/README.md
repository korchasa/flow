# Experiment: `claude-md-length`

Empirically determines the maximum token budget of project memory files
(`AGENTS.md`/`CLAUDE.md`/`.cursorrules`) at which an agent still follows
an embedded rule with at least 80% reliability.

Replaces the unverified community claim of "keep CLAUDE.md under 200
lines" with a model-anchored, reproducible number.

## Methodology

### Two variants

- **`single-file`** — all memory is placed in one root `AGENTS.md`
  (plus a `CLAUDE.md` symlink for Claude Code). Sweeps size in tokens.
- **`tree-sum`** — the memory budget is split evenly across three files
  in the ancestor chain: `AGENTS.md`, `documents/AGENTS.md`, and
  `scripts/AGENTS.md`. Sweeps the *sum* of all three. Tests whether
  distributing instructions across files helps, hurts, or is neutral
  relative to one large file of the same total size.

### Axes

| Axis     | `single-file` values                     | `tree-sum` values                    |
|----------|------------------------------------------|--------------------------------------|
| `tokens` | 500, 1000, 2000, 4000, 8000, 16000       | 1500, 3000, 6000, 12000, 24000       |
| `rule`   | `format`, `language`, `negation`         | `format`, `language`, `negation`     |

Five repetitions per cell. One rule is active per trial (never all three
at once — they would compete for attention and confound the result).
The rule is embedded at the 50% line position within the root file to
isolate the effect of total budget from the effect of position (which
deserves a separate future experiment).

### Rules under test

Three orthogonal rules that exercise distinct adherence modes:

- **`format`** — the agent must end its final response with
  `===NIMBUS-END===` as the last line. Tests "did the agent notice a
  surface-level output constraint".
- **`language`** — the agent must reply in Russian regardless of the
  query language. Tests "did the agent notice a strong behavioral
  override affecting all prose".
- **`negation`** — the agent must not use the word `simply`. Tests
  "did the agent notice a prohibition".

### Noise

The memory file is padded with content from a committed corpus
([`noise-corpus.md`](noise-corpus.md)) describing a fictional project
called Nimbus Logistics API. The corpus contains *no executable
directives* — it is purely descriptive prose about architecture,
terminology, and history. This provides ecologically realistic noise
(the kind of content a real AGENTS.md might contain) without polluting
the adherence signal with competing instructions.

Noise is generated deterministically from a seed derived from
`(base_seed, cell_axes, trial)`, so rerunning the same experiment with
the same seed produces byte-identical memory files.

### Query

One neutral query is used across all trials:

> Read README.md in the project root and summarize in 2 sentences what
> the project does.

The query does not mention or hint at any of the three rules. A
minimal `README.md` is written to the sandbox so the agent has
something to read.

### Judging

Each trial is judged by a single call to a Claude LLM judge with a
binary pass/fail verdict on one specific rule (the one active for that
trial). The judge receives the rule, the original query, and the
agent's full output.

Adherence per cell is the mean of 5 pass/fail trials. Adherence per
token budget is the mean across all rules at that budget.

### Headline number

```
max(tokens : mean_adherence(tokens) ≥ 0.8)
```

If the function is non-monotonic, the headline reports the largest
token budget such that every smaller budget also passed the threshold.

## How to run

```bash
# Full run (single-file variant, ~90 trials, ~45-60 min on Opus)
deno task experiment claude-md-length --variant single-file --model claude-opus-4-6

# Full run (tree-sum variant, ~75 trials)
deno task experiment claude-md-length --variant tree-sum --model claude-opus-4-6

# Smoke test (one cell, one rep)
deno task experiment claude-md-length --variant single-file --reps 1 --sizes 500 --rules format

# Dry run (print plan, don't execute)
deno task experiment claude-md-length --variant single-file --dry-run
```

Flags:

- `--model <id>` — pin the agent model under test.
- `--ide <id>` — IDE adapter (default: `claude`; `cursor` supports
  single-file only because it lacks hierarchical memory).
- `--reps <n>` — override trials per cell.
- `--sizes <csv>` — override the tokens axis.
- `--rules <csv>` — override the rule axis.
- `--seed <n>` — change the base seed.

## How to read results

Each run produces two sibling files in `results/`:

- `<DATE>-<model>-<variant>.json` — full per-trial raw data.
- `<DATE>-<model>-<variant>.md` — human summary with headline, token
  table, per-rule breakdown, and sample failures.

The adherence-by-tokens table shows how often the agent followed the
rule at each token budget, averaged over all rules and repetitions.
Expect a roughly monotonic decrease past some threshold. If the curve
is flat at 100% across all sizes, the experiment needs a harder rule
or smaller reps; if it is near 0% across all sizes, the rule is likely
unclear and the corpus or rule text needs revision.

## Caveats

- **Token count is estimated** via a 1-token ≈ 4-char heuristic
  (±15% accuracy). The axis values are approximate. Swap in a real
  tokenizer if tighter precision is needed.
- **Prompt caching on the provider side** may reduce variance across
  repetitions within a cell (identical memory content repeats). The
  runner records token usage per trial so cache effects can be
  audited post-hoc.
- **Sample size is small**: 5 reps per cell → ~30% confidence interval
  on single-cell adherence. The headline number is an approximation,
  not a statistical certainty.
- **Fixed rule position**: the rule is always at the 50% file line.
  Position effects (primacy/recency, lost-in-the-middle) are a known
  confound — a separate position-sweep experiment would be needed to
  isolate them.
- **Fixed noise corpus**: one fictional project. Results on a corpus
  with different prose characteristics (terser, denser, more technical)
  may differ.
- **Model-specific**: the headline number is tied to the exact model
  run. Retest when switching models or after major Claude CLI upgrades.
- **IDE-specific**: Claude loads ancestor `CLAUDE.md` files eagerly;
  Cursor loads only `.cursorrules` at project root and has no
  equivalent hierarchical mechanism — the `tree-sum` variant is
  Claude-only.
- **Non-deterministic agent**: even with `temperature=0`, small
  variations in tool use and context can change outputs. Single-trial
  results are noisy; always look at the aggregate curve rather than a
  single cell.

## Related documents

- [`documents/benchmarking.md`](../../../documents/benchmarking.md) —
  Benchmark vs Experiment concept separation.
- [`documents/requirements.md`](../../../documents/requirements.md) —
  `FR-EXP`, `FR-EXP.MEMORY-LENGTH`.
- [`documents/design.md`](../../../documents/design.md) — §3.4a
  Experiments Subsystem.
- [`documents/rnd/claude-code-best-practice.md`](../../../documents/rnd/claude-code-best-practice.md) —
  secondary-source "<200 lines" claim that motivated this experiment.
