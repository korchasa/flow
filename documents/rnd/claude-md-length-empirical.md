# Empirical CLAUDE.md / AGENTS.md Length — First Results

Empirical study replacing the folk «keep each CLAUDE.md < 200 lines» rule with measured numbers.

- **Implements**: [FR-EXP.MEMORY-LENGTH](../requirements.md)
- **Code**: [`scripts/experiments/claude-md-length/`](../../scripts/experiments/claude-md-length/)
- **Raw data**: [`scripts/experiments/claude-md-length/results/`](../../scripts/experiments/claude-md-length/results/)
- **Methodology**: [`scripts/experiments/claude-md-length/README.md`](../../scripts/experiments/claude-md-length/README.md)
- **Status**: first results committed — `claude-haiku-4-5` only. Larger models (Sonnet, Opus) are a natural next step.

## 1. Motivation

The [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) repo's own `CLAUDE.md` says: «keep each CLAUDE.md < 200 lines for reliable adherence. Larger files dilute attention». This is a folk claim from one practitioner with no underlying data. It propagates through the ecosystem as a hard rule.

The claim conflates three variables:
- **File size** — what the rule is nominally about.
- **Rule complexity** — «end with marker X» vs «reply in language Y» load the model differently.
- **File layout** — one root file vs several in the ancestor chain (Claude's lazy-load hierarchy).

The experiment measures how adherence to an injected test rule decays with (a) total memory budget in tokens and (b) layout, isolating these variables from rule complexity by testing three different rule types independently.

## 2. Methodology (Condensed)

- Two sweeps under one name: `single-file` (all memory in root `AGENTS.md`) and `tree-sum` (equal split across `AGENTS.md` + `documents/AGENTS.md` + `scripts/AGENTS.md`).
- Per sweep: **tokens × rule × 5 reps**. Cells are independent: one rule per trial, never all at once.
- **Rules** (three orthogonal kinds of adherence):
  1. `format` — end every response with `===NIMBUS-END===`. Surface marker.
  2. `language` — reply in Russian regardless of query language. Behavioral override on every sentence.
  3. `negation` — never use the word `simply`. Prohibition.
- **Noise**: deterministic shuffled sampling from a committed corpus describing a fictional «Nimbus Logistics API» project — descriptive prose only, zero directives.
- **Neutral query** on every trial: «Read README.md in the project root and summarize in 2 sentences what the project does.»
- **Judge**: Claude Sonnet 4.6 with structured JSON output. One binary verdict per trial against the rule active in that trial.
- **Cleanroom**: every trial spawns `claude -p` with `CLAUDE_CONFIG_DIR=<empty tmpdir>` + `CLAUDE_CODE_OAUTH_TOKEN=<keychain token>` + `CLAUDECODE=""`. This blocks the user's global `~/.claude/CLAUDE.md`, ancestor project files, and the `CLAUDECODE` nesting marker. **This isolation is not optional** — initial smoke tests without it produced Russian-language contamination from the tester's global CLAUDE.md, which would have ruined the `language` rule measurement.
- **Headline**: `max(tokens : mean_adherence ≥ 0.8)`, i.e. the largest sweep value where at least 80% of trials pass, averaged over all three rules and 5 reps.

## 3. Results — Haiku 4.5

Model: `claude-haiku-4-5`. Judge: `claude-sonnet-4-6`. 5 repetitions per cell. Durations: single-file 23.6 min / 90 trials, tree-sum 19.2 min / 75 trials.

### 3.1 single-file — one root AGENTS.md

Aggregate adherence (averaged across all three rules):

| tokens | adherence | n   | pass | fail |
|--------|-----------|-----|------|------|
| 500    | 86.7%     | 15  | 13   | 2    |
| 1000   | 86.7%     | 15  | 13   | 2    |
| 2000   | 73.3%     | 15  | 11   | 4    |
| 4000   | 66.7%     | 15  | 10   | 5    |
| 8000   | 73.3%     | 15  | 11   | 4    |
| 16000  | 80.0%     | 15  | 12   | 3    |

**Headline: 1000 tokens** (the largest size where adherence is still ≥80% before first dip). The curve is non-monotonic — adherence recovers to 80% at 16k — which is noise on n=5.

Per-rule per-size breakdown (pass/5 per cell):

| tokens | format | language | negation |
|--------|--------|----------|----------|
| 500    | 5/5    | 3/5      | 5/5      |
| 1000   | 5/5    | 3/5      | 5/5      |
| 2000   | 5/5    | 1/5      | 5/5      |
| 4000   | 5/5    | 2/5      | 3/5      |
| 8000   | 5/5    | 1/5      | 5/5      |
| 16000  | 5/5    | 2/5      | 5/5      |

### 3.2 tree-sum — root + `documents/` + `scripts/`

| total tokens | adherence | n  | pass | fail |
|--------------|-----------|----|------|------|
| 1500         | 93.3%     | 15 | 14   | 1    |
| 3000         | 86.7%     | 15 | 13   | 2    |
| 6000         | 80.0%     | 15 | 12   | 3    |
| 12000        | 73.3%     | 15 | 11   | 4    |
| 24000        | 60.0%     | 15 | 9    | 6    |

**Headline: 6000 total tokens** (monotonic decay, cleanest signal).

Per-rule per-size breakdown:

| tokens | format | language | negation |
|--------|--------|----------|----------|
| 1500   | 5/5    | 4/5      | 5/5      |
| 3000   | 5/5    | 3/5      | 5/5      |
| 6000   | 5/5    | 3/5      | 4/5      |
| 12000  | 5/5    | 2/5      | 4/5      |
| 24000  | 5/5    | 0/5      | 4/5      |

## 4. Findings

### F1 — Rule type dominates over file size

The `format` rule (emit a marker at the end of the reply) is followed at **100% everywhere — from 500 to 24 000 tokens**. No decay. This rule's cost to attention is negligible.

The `language` rule (reply in Russian) is the limiting factor in both sweeps. In tree-sum it decays cleanly from 80% at 1500 tokens to **0% at 24 000 tokens**. In single-file it's already noisy at 500 tokens (60%) — below-threshold from the start, which means for this model the instruction is marginal even in a small file.

The `negation` rule (don't say «simply») is mostly perfect with occasional dips — 93% average in single-file, 88% in tree-sum.

**Implication**: «max safe length» is not a property of the file. It is a property of the strictest rule the file contains. Quoting one number without specifying the rule is misleading.

### F2 — Tree layout extends the budget ~6×

Compare the adherence curves at the 80% threshold:

- single-file: ≥80% up to **1000 tokens**
- tree-sum: ≥80% up to **6000 tokens**

Distributing the same budget across `AGENTS.md` + `documents/AGENTS.md` + `scripts/AGENTS.md` buys roughly **6× more total budget** at the same reliability. The likely mechanism is Claude's lazy descendant loading: `documents/AGENTS.md` and `scripts/AGENTS.md` do not enter context at session start, only when the agent reads files in those directories. For the neutral query used here (which only touches `README.md` in the root), those descendants may not even be loaded — meaning tree-sum is partially measuring «how much of this budget never even reaches context».

**Implication**: For projects with substantial memory needs, split the root `AGENTS.md` into a small eager skeleton and descendant files that load on demand.

### F3 — Haiku 4.5 is particularly weak at behavioral overrides

The `language` rule is a strong, high-visibility behavioral override: «regardless of what the user asks, always reply in Russian». On paper this should be easy — it's a single rule that applies to every output token. In practice, Haiku 4.5 drops it **40% of the time in the smallest (500-token) single-file cell**, and 100% of the time in the largest (24 000 total) tree-sum cell.

This is the most surprising result of the study. It suggests Haiku's instruction-following for «pervasive behavioral» rules is fragile in ways that «local output format» rules are not. This may reflect training tradeoffs specific to Haiku; repeating the experiment on Sonnet and Opus is the most urgent open item.

### F4 — The «200 lines» rule has a grain of truth

200 lines of compact markdown is roughly 800–1200 tokens. The single-file headline of **1000 tokens** lands squarely in that range. The folk rule is a reasonable heuristic *for a single eager-loaded file under Haiku*. It is wrong as a universal rule — it over-applies to descendant files (which can be larger), under-distinguishes between rule types (format can be much larger), and has no model-specificity.

## 5. Caveats

- **Single model.** Only Haiku 4.5 tested. Larger models will likely have higher thresholds. Running Sonnet/Opus is the next step.
- **Three rules.** Orthogonal, but not exhaustive. Pathological rule types (e.g. «always cite a specific file», «follow a 12-step workflow») may decay differently.
- **Five repetitions.** Confidence interval on a single cell is wide (±30 percentage points at n=5). The aggregated numbers are more reliable but still noisy.
- **Fixed rule position** in the middle of the root file. Primacy/recency effects are not measured — a separate position-sweep experiment is required to isolate them.
- **Single fictional corpus.** Different prose density or structure may shift the curve.
- **Token heuristic**: 1 token ≈ 4 chars, ±15%. Axis values are approximate.
- **Prompt cache** on Anthropic's side may reduce variance within a cell (identical memory on 5 reps). Token usage per trial is logged in the JSON for post-hoc audit.
- **Neutral query reads only README.md** — it may not trigger descendant loading in tree-sum. If it doesn't, tree-sum is measuring budget that never enters context, inflating its headline. A follow-up should use a query that forces the agent to read files in each sub-directory.
- **Judge is the same model family.** Judge bias is possible but unlikely for these binary, surface-observable rules.

## 6. Recommendations

- **For flowai users**: put a small eager skeleton (~500–1000 tokens, under 200 lines) in root `AGENTS.md`. Push domain detail into `documents/AGENTS.md` and `scripts/AGENTS.md` where it loads lazily. This is exactly what the existing flowai scaffold already does — the experiment validates that layout empirically.
- **For flowai itself**: the proposed [`check-claude-md-length.ts`](../rnd/claude-code-best-practice.md#L530) lint should warn on the **root** file at ~1000 tokens and allow descendants to be larger. Do not apply one global threshold.
- **Do not quote «200 lines» as a universal rule.** When telling users about memory budgets, cite this study and specify the model family.

## 7. Follow-ups

Numbered by priority:

1. **Repeat on Sonnet 4.6 and Opus 4.6.** Biggest open question: does the language-rule fragility persist on larger models or is it Haiku-specific? Same sweeps, same corpus, same judge.
2. **Position sweep.** Fix tokens=4000 and vary rule position ∈ {0%, 25%, 50%, 75%, 100%}. Measures primacy/recency + lost-in-the-middle effects.
3. **Descendant-loading-aware query.** The current neutral query only reads `README.md`. A query that forces the agent to read files in `documents/` and `scripts/` would give a more honest tree-sum number.
4. **Rule-complexity sweep.** Fix layout, vary rule from trivial (single word ban) to complex (multi-step workflow). Quantifies F1.
5. **Cross-IDE.** Cursor has no hierarchical memory, only `.cursorrules`. Single-file sweep on Cursor would test whether the 1000-token threshold is a Claude-specific artifact or a property of Haiku.
6. **Monotonicity sanity check.** The single-file curve is non-monotonic (73% at 2k, 66% at 4k, 73% at 8k, 80% at 16k). Rerun with n=15 per cell to see if it smooths out or if there's a real phenomenon hiding in the middle.

## 8. Reproduction

```bash
deno task experiment claude-md-length --variant single-file --model claude-haiku-4-5
deno task experiment claude-md-length --variant tree-sum --model claude-haiku-4-5
```

Results are committed to [`scripts/experiments/claude-md-length/results/`](../../scripts/experiments/claude-md-length/results/) as dated JSON + Markdown pairs. The JSON contains every trial's full output, timing, token usage, and judge verdict — enough to recompute any aggregate or verify any specific claim in this document.

Raw data files for this study:

- [`2026-04-11-claude-haiku-4-5-single-file.json`](../../scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-single-file.json) — 1.0 MB, 90 trials.
- [`2026-04-11-claude-haiku-4-5-tree-sum.json`](../../scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-tree-sum.json) — 856 KB, 75 trials.
- Corresponding `.md` files for human summaries.
