# Evaluation Subsystem Design

Two distinct evaluation classes share infrastructure (`SpawnedAgent`, IDE adapters, LLM judge) but serve different goals.

## 0. Benchmarks vs Experiments

- **Benchmark** — regression test for a single framework primitive (skill, command, agent). Binary pass/fail per scenario. Run via `deno task bench`. Scenarios co-located with primitive under `framework/<pack>/.../<primitive>/benchmarks/`. Run artifacts in `benchmarks/runs/` (gitignored). Goal: detect regressions in primitive behavior.
- **Experiment** — parameterized sweep producing a curve or headline number. Not tied to any primitive. Run via `deno task experiment`. Code under `scripts/experiments/<name>/`. Results committed to `scripts/experiments/<name>/results/` as JSON + Markdown. Goal: empirically measure a system characteristic (e.g., max memory file length at which adherence stays ≥80%).

Key differences:

- **Output unit** — benchmark: pass/fail per checklist item; experiment: continuous metric over axes.
- **Repetition** — benchmark: typically 1 run per scenario; experiment: N reps per cell for statistical confidence.
- **Result lifecycle** — benchmark: ephemeral runs, result stored in git only indirectly via tests; experiment: raw results committed as evidence.
- **Discovery** — benchmark: walked from `framework/`; experiment: explicit name passed to CLI.
- **Scope** — benchmark: tests one primitive's behavior; experiment: tests the agent platform, IDE, model, or combinations thereof.

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Scenarios are co-located with each primitive (commands, skills, agents); runs and infra stored centrally in `benchmarks/`.

```text
framework/<pack>/commands/<command>/
├── SKILL.md                    # User-only primitive
└── benchmarks/
    └── <scenario>/
        ├── mod.ts              # Scenario definition
        └── fixture/            # Test fixtures (optional)

framework/<pack>/skills/<skill>/
├── SKILL.md                    # Agent-invocable primitive
└── benchmarks/
    └── <scenario>/
        ├── mod.ts
        └── fixture/

benchmarks/
├── runs/                       # All run artifacts (git-ignored)
│   └── <timestamp>/
│       ├── <scenario-id>/
│       │   └── sandbox/        # Isolated execution environment
│       └── report.html         # Execution log and report
├── benchmarks.lock
└── config.json                 # Multi-IDE benchmark configuration
```

## 2.1 Multi-IDE Architecture

Benchmarks support multiple IDEs (Cursor, Claude Code) via an adapter pattern.

- **Config** (`benchmarks/config.json`): IDE-keyed structure with per-IDE agent models and judge settings
  - `default_ides`: array of IDE ids to run by default
  - `ides.<ide>.agent_models`: available models for the IDE
  - `ides.<ide>.default_agent_model`: default model
  - `ides.<ide>.judge`: LLM judge config (model, temperature)
- **Adapters** (`scripts/benchmarks/lib/adapters/`):
  - `types.ts`: `AgentAdapter` interface (CLI args, output parsing, mock setup, env, usage)
  - `cursor.ts`: `CursorAdapter` — wraps `cursor-agent` CLI
  - `claude.ts`: `ClaudeAdapter` — wraps `claude` CLI with streaming JSON
  - `mod.ts`: factory `createAdapter(ide)` and `SUPPORTED_IDES` constant

## 3. Trace Log (`trace.html`)

Each scenario run generates a `trace.html` file containing a comprehensive record of the session. This allows for post-mortem analysis of the agent's reasoning and actions.

### Format Specification

The trace is a structured HTML document designed for readability and detailed inspection.

- **Visual Separation**: Clear delimiters between logical sections (Messages, Commands, Evaluations).
- **Embedded Metadata**: Each section includes machine-readable metadata (type, source, role, step, etc.).
- **Source Attribution**: Clearly identifies the origin of every interaction (`agent`, `judge`, `user_emulation`, `system`).
- **Tool Context**: Includes definitions of tools or mocks available to the agent during the run.
- **Interactive Elements**: Collapsible sections for long content (LLM responses, command outputs).
- **Content Decoding**: Automatically decodes URL-encoded content in events for better readability.

## 5. Current State (2026-01-31)

| Scenario ID | Result | Errors | Warnings | Time (s) | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `flowai-answer-basic` | PASSED | 0 | 0 | 17.6 | |
| `flowai-commit-basic` | PASSED | 0 | 1 | 19.0 | |
| `flowai-commit-atomic-refactor` | PASSED | 0 | 0 | 21.1 | |
| `flowai-commit-atomic-docs` | PASSED | 0 | 0 | 18.9 | |
| `flowai-commit-check` | PASSED | 0 | 0 | 30.0+ | |
| `flowai-commit-check-fail` | PASSED | 0 | 0 | 19.9 | Correctly refused to commit on check failure |
| `flowai-commit-deps` | PASSED | 0 | 0 | 22.1 |  |
| `flowai-commit-sync-docs` | PASSED | 0 | 0 | 21.5 | |
| `flowai-commit-atomic-hunk` | PASSED | 0 | 0 | 27.0 | |
| `flowai-init-brownfield` | FAILED | 5 | 0 | 31.0 | Claims to create files (AGENTS.md, docs) but doesn't |
| `flowai-investigate-basic` | PASSED | 0 | 0 | 14.7 | |
| `flowai-plan-basic` | PASSED | 0 | 0 | 39.0 | Fixed runner.ts to include task file in evidence |
| `flowai-plan-context` | PASSED | 0 | 0 | 25.5 | |
| `flowai-plan-db` | PASSED | 0 | 0 | 22.7 | Generalized environment side-effects rule |
| `flowai-plan-interactive` | PASSED | 0 | 0 | 35.9 | Full multi-turn flow with SimulatedUser and resume |
| `flowai-plan-migration` | PASSED | 0 | 0 | 19.0 | Correctly proposed fetch and async/await |
| `flowai-plan-refactor` | FAILED | 1 | 0 | 17.9 | Missing test preservation step |
| `flowai-plan-variants-complex` | FAILED | 3 | 0 | 30.5 | No task file, no variants, no tradeoffs |
| `flowai-plan-variants-obvious` | FAILED | 1 | 0 | 17.1 | Task file not created |
| `flowai-maintenance-basic` | FAILED | 2 | 0 | 118.7 | Claims task file update but doesn't; missed TODO |

## 6. Experiments Subsystem

Parallel track to Benchmarks. Infrastructure in `scripts/experiments/lib/`; individual experiments in `scripts/experiments/<name>/`.

### 6.1 Directory Structure

```text
scripts/experiments/
├── lib/
│   ├── types.ts        # Experiment, Cell, TrialResult, ExperimentReport
│   ├── runner.ts       # Sweep orchestrator over SpawnedAgent
│   ├── judge.ts        # Binary adherence judge wrapper
│   ├── noise.ts        # Deterministic noise content builder
│   ├── tokens.ts       # Token count heuristic
│   └── report.ts       # JSON + Markdown report writers
├── <experiment>/
│   ├── README.md       # Methodology, how to read, caveats
│   ├── <variant>.ts    # Experiment definition(s)
│   ├── shared.ts       # Rule library, common setup
│   ├── <data>.md       # Committed static inputs (e.g., noise corpus)
│   └── results/        # Committed JSON + MD per run
│       └── <date>-<model>-<variant>.{json,md}
```

### 6.2 Contract

```typescript
interface Experiment {
  id: string;
  name: string;
  description: string;
  axes: Record<string, unknown[]>;     // cartesian product of cells
  defaults: { reps: number; model?: string; ide?: string };
  setupCell(cell: Cell, ctx: CellContext): Promise<void>;
  query(cell: Cell): string;           // prompt to agent (must not hint at rule)
  judgePrompt(cell: Cell, agentOutput: string): JudgeRequest;
}
```

### 6.3 CLI

- `deno task experiment <name> [--variant <v>] [--model <m>] [--ide <i>] [--reps <n>] [--sizes <csv>] [--parallel <n>]`
- Default parallelism: 1 (reproducibility over speed).
- Results written to `scripts/experiments/<name>/results/<ISO-DATE>-<model-slug>-<variant>.{json,md}`.

### 6.4 Headline Number

Each experiment defines a `headline(report)` function producing a single string like:
`"Max safe tokens: 4000 at ≥80% adherence, model=claude-opus-4-6, ide=claude, n=15/cell"`

### 6.5 Cross-IDE Support

Experiments reuse the same `AgentAdapter` layer as benchmarks. The adapter contract is extended with a `writeMemoryFile(sandboxPath, scope, content)` method so experiments can place memory files in the correct IDE-specific location (`CLAUDE.md`/`AGENTS.md` for Claude, `.cursorrules` for Cursor, etc.).
