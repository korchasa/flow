# Development Commands

## Shell Environment
- ALWAYS prefix shell commands with `NO_COLOR=1` to disable ANSI color codes in output. Colored output is unreadable for agents and pollutes logs.
- All project scripts MUST respect the `NO_COLOR` env var (https://no-color.org/). When `NO_COLOR` is set, scripts MUST NOT emit ANSI escape codes.

## Standard Interface
- `check` - The main command for comprehensive project verification. Performs the following steps:
  - build the project
  - comment-scan: "TODO", "FIXME", "HACK", "XXX", debugger calls, linters and formatters suppression
  - code formatting check
  - static code analysis
  - runs all project tests
- `test <path>` - Runs a single test.
- `dev` - Runs the application in development mode with watch mode enabled.
- `prod` - Runs the application in production mode.

## Detected Commands
{{DEVELOPMENT_COMMANDS}}

## Command Scripts
{{COMMAND_SCRIPTS}}
