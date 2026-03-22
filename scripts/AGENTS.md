# Scripts Module

## Shell Environment
- ALWAYS prefix shell commands with `NO_COLOR=1` to disable ANSI color codes in output. Colored output is unreadable for agents and pollutes logs.
- All project scripts MUST respect the `NO_COLOR` env var (https://no-color.org/). When `NO_COLOR` is set, scripts MUST NOT emit ANSI escape codes.

## Responsibility

Build tooling, verification, and benchmark infrastructure for AssistFlow.

- `scripts/*.ts` — Deno task entry points (check, test, dev, bench)
- `scripts/benchmarks/lib/` — Benchmark framework: adapter layer for IDE CLIs, scenario runner, LLM judge, trace visualization, token usage estimation
- `scripts/check-*.ts` — Validation scripts for skills and sync integrity

## Standard Interface
- `check` - Comprehensive project verification: formatting, linting, tests, skill validation
- `test <path>` - Runs a single test
- `dev` - Runs the application in development mode with watch mode enabled

## Detected Commands
- `deno task check` (check deno.json)
- `deno task test` (check deno.json)
- `deno task dev` (check deno.json)
- `deno task bench` (check deno.json)
