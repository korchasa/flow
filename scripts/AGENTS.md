# Development Commands

## Shell Environment
- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (https://no-color.org/) — disable ANSI colors when it is set.
- All project scripts auto-detect AI agent environments (`CLAUDECODE=1`) and disable ANSI colors automatically. Manual `NO_COLOR=1` prefix is not required when running from Claude Code.

## Responsibility

Build tooling, verification, and benchmark infrastructure for flowai.

- `scripts/*.ts` — Deno task entry points (check, test, dev, bench)
- `scripts/benchmarks/lib/` — Benchmark framework: adapter layer for IDE CLIs, scenario runner, LLM judge, trace visualization, token usage estimation
- `scripts/check-*.ts` — Validation scripts for skills and sync integrity

## Standard Interface
- `check` — the main command for comprehensive project verification. Runs the following steps in order:
  - code formatting check
  - static code analysis (linting)
  - all project tests
  - skill validation
- `test <path>` — runs a single test file or test suite.
- `dev` — runs the application in development mode with watch mode enabled.

## Detected Commands
- `deno task check` (check deno.json)
- `deno task test` (check deno.json)
- `deno task dev` (check deno.json)
- `deno task bench` (check deno.json)
