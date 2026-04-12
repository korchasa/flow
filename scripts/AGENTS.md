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

## `deno task check` Output Quirks

- The output ALWAYS contains three lines:
  ```
  === FAIL deno eval Deno.exit(42) ===
  === FAIL deno eval Deno.exit(1) ===
  === FAIL deno eval Deno.exit(2) ===
  ```
  These are **intentional test fixtures** inside `runCommandsInParallelBuffered` tests in `task-check_test.ts` — they verify that the parallel runner correctly reports failed sub-commands. They are NOT real failures.
- **Real verdict** comes from the final `N passed | M failed` summary lines, NOT from the presence of `=== FAIL` strings. Always grep for `failed` count, not for `FAIL`.
- If the agent stops on `=== FAIL deno eval Deno.exit(...)` without checking the summary line, it is a false alarm.

## Benchmark Infrastructure Smoke Test

Before writing or modifying a benchmark scenario for a command or skill, run one **existing** scenario for the same primitive to verify infrastructure works:

```sh
deno task bench -f <existing-scenario-id>
```

If it finishes with 0 agent steps or "Unknown skill" — the benchmark runner has an infrastructure bug (e.g., `copyFrameworkToIdeDir` not copying the primitive). Fix the runner first; do not write new scenarios on broken infrastructure.

The runner also pre-checks that `scenario.skill` is mounted in the sandbox before spawning the agent and warns on suspiciously short agent output (< 200 chars with exit 0).

## Lint Exclude / Test Ignore Drift

- `deno.json` `lint.exclude` and `scripts/task-check.ts` `--ignore` flag must list the SAME paths (`framework/*/skills/*/benchmarks/`, `framework/*/commands/*/benchmarks/`, `framework/*/benchmarks/*/fixture/`).
- These two locations drift in practice. When adding a new ignore pattern, update BOTH.
- Drift symptom: `deno task check` lint passes but `deno task check` test phase imports test fixtures as production code (`no-explicit-any` errors in `*/fixture/*.ts`).
