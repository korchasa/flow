# Benchmarking Subsystem Design

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Work artifacts are stored in `benchmarks/`, which is git-ignored. Scenarios are organized hierarchically.

```text
scripts/benchmarks/
├── scenarios/
│   └── <skill>/
│       └── <scenario>/
│           └── mod.ts          # Scenario definition
└── work/
    └── <scenario-id>/          # e.g., af-commit-basic
        ├── sandbox/            # Isolated execution environment
        │   ├── .git/
        │   ├── README.md
        │   └── ... (project files)
        └── trace.md            # Execution log and report
```

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

| Scenario ID | Result | Errors | Warnings | Notes |
| :--- | :--- | :---: | :---: | :--- |
| `af-commit-basic` | FAILED | 1 | 0 | Unclean status after commit (untracked files) |
| `af-commit-atomic-refactor` | PASSED | 0 | 0 | |
| `af-commit-atomic-docs` | PASSED | 0 | 0 | |
| `af-commit-check` | PASSED | 0 | 0 | |
| `af-commit-sync-docs` | PASSED | 0 | 0 | |
| `af-commit-atomic-hunk` | PASSED | 0 | 0 | |
| `af-commit-deps` | FAILED | 2 | 0 | Missing 'chore:' and 'feat:' prefixes in atomic commits |
| `af-commit-check-fail` | FAILED | 1 | 0 | Committed changes despite `deno task check` failure |
| `af-plan-basic` | INTERRUPTED | - | - | Stopped due to PTY read error or missing simulated user |
