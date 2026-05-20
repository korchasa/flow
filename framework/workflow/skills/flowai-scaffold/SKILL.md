---
name: flowai-scaffold
description: Scaffold flowai-workflow in a project. Runs `flowai-workflow init` to copy a bundled workflow (github-inbox, autonomous-sdlc, etc.) into .flowai-workflow/<name>/, then adapts workflow.yaml and agents/agent-*.md to project specifics. Use when asked to add flowai-workflow, scaffold a new DAG workflow, or create an agent pipeline.
argument-hint: target project path (optional, defaults to cwd)
effort: medium
---

# Scaffold flowai-workflow

Two-phase setup: (1) scaffold a bundled workflow with `flowai-workflow init`,
then (2) adapt the copied files using the reference manual below.

## Prerequisites

- `flowai-workflow` binary (JSR install or `deno compile`), or Deno runtime.
- A supported AI IDE CLI installed and authenticated: `claude`, `opencode`,
  `cursor`, or `codex`. Match the CLI to `defaults.runtime`.
- Git repo with a clean tree — engine creates per-run worktrees. `init`
  refuses to write into a dirty tree unless `--allow-dirty` is passed.

## Phase 1 — Scaffold with `flowai-workflow init`

### Choose a bundle

`flowai-workflow init --list` enumerates bundled workflows. Current set:

- `github-inbox` (default) — 6-node SDLC: triage GitHub issues → design →
  decision → build → verify → tech-lead review. Claude Sonnet 4-6, HITL
  polling (60 s, 2 h timeout).
- `github-inbox-opencode` — same 6-node SDLC, OpenCode + GLM-4.7.
- `github-inbox-opencode-test` — minimal smoke test (single agent lists a
  dir and summarises README).
- `autonomous-sdlc` — 5-agent local-only pipeline (no PR, no push). PM
  autonomously scores tasks, Tech-Lead Review merges to local `main` via
  `git merge --no-ff`. OpenCode + GLM-4.7.

Triage:

- GitHub-issue-driven SDLC, Claude → `github-inbox`.
- GitHub-issue-driven SDLC, GLM-4.7 → `github-inbox-opencode`.
- Local-only no-PR pipeline → `autonomous-sdlc`.
- Smoke test of OpenCode runtime → `github-inbox-opencode-test`.

### Run init

```
flowai-workflow init --workflow <name>
```

Flags: `--workflow <name>`, `-l|--list`, `--dry-run`, `--allow-dirty`,
`-h|--help`. `init` performs a verbatim recursive copy to
`.flowai-workflow/<name>/` and prints an *adaptation prompt*.

### Phase 2 hand-off

After `init` succeeds, edit:

- `.flowai-workflow/<name>/workflow.yaml` — set repo-specific
  `defaults.runtime`, `model`, branch references in `prepare_command` /
  agent prompts.
- `.flowai-workflow/<name>/agents/agent-*.md` — fill in project context
  (test command, lint command, code-style rules, repo slug).
- Project `.gitignore` — ensure `runs/` and per-run memory files are
  ignored.

## Directory structure

```
.flowai-workflow/
  <workflow-name>/
    workflow.yaml     # required, name-locked to folder
    agents/           # reusable system_prompt fragments
    prompts/          # reusable user-prompt fragments (optional)
    scripts/          # HITL ask/check, prepare, on_failure scripts
    memory/
      reflection-protocol.md   # tracked
      agent-*.md               # gitignored
    runs/             # gitignored
      <run-id>/{state.json, worktree/, <node-id>/}
```

`.gitignore`:

```
.flowai-workflow/<workflow-name>/runs/
.flowai-workflow/<workflow-name>/memory/agent-*.md
!.flowai-workflow/<workflow-name>/memory/agent-*-history.md
```

## Top-level fields (`workflow.yaml`)

- `name` (string, required) — workflow identifier.
- `version` (string, required) — must be `"1"`.
- `defaults` (object, optional) — workflow-wide defaults (see below).
- `env` (object, optional) — merged into agent env as `{{env.<key>}}`.
- `nodes` (object, required) — DAG node definitions; ≥ 1 entry.
- `phases` (object, optional) — `Record<phase, nodeId[]>`. Mutually
  exclusive with per-node `phase:`.

`pre_run` is removed — use `defaults.worktree_disabled: true` to opt out of
worktree isolation.

## `defaults` block (workflow-wide)

### Execution

- `worktree_disabled` (bool, default `false`) — run in CWD instead of
  per-run git worktrees.
- `max_parallel` (number, default `0`, unlimited) — concurrent node cap.
  Parallel execution is deferred; nodes run sequentially.
- `prepare_command` (string) — shell command run once before the node loop
  on fresh runs (skipped on resume). Templated.
- `on_failure_script` (string) — invoked when the workflow fails.

### Runtime

- `runtime` (`"claude"|"opencode"|"cursor"|"codex"`, default `"claude"`).
- `runtime_args` (`Record<string, string|null>`, default `{}`) — extra CLI
  args. `{"--flag":"value"}` flag with value; `{"--bool":""}` boolean
  flag; `{"--suppressed":null}` suppress a parent flag. Reserved keys
  forbidden when typed `allowed_tools`/`disallowed_tools` is set:
  `--allowedTools`, `--allowed-tools`, `--disallowedTools`,
  `--disallowed-tools`, `--tools`.
- `permission_mode` (`"acceptEdits"|"bypassPermissions"|"default"|"plan"`).
  For `opencode`/`cursor` only `bypassPermissions` is supported.
- `model` (string) — e.g. `"claude-sonnet-4-6"`, `"claude-opus-4-7"`.
- `effort` (`"minimal"|"low"|"medium"|"high"`) — reasoning effort dial.
  Skipped on `--resume`.

### Per-node settings (cascade)

- `max_continuations` (number, default `3`).
- `timeout_seconds` (number, default `1800`).
- `on_error` (`"fail"|"continue"`, default `"fail"`).
- `max_retries` (number, default `3`).
- `retry_delay_seconds` (number, default `5`).

### Budget

- `budget.max_usd` (positive number) — per-node `cost_usd` cap.
- `budget.max_turns` (positive int) — Claude only, maps to `--max-turns`.

### Tool filter (mutually exclusive)

- `allowed_tools` (string[]) — whitelist; Claude `--allowedTools`. Other
  runtimes warn.
- `disallowed_tools` (string[]) — blacklist.

### Memory check

- `memory_paths` (string[]) — globs of agent reflection-memory files.
  Dirty matches without `memory_commit_deferred: true` fail the node.
  Empty disables the check.

### HITL

- `hitl.ask_script` (required if hitl set) — posts the question.
- `hitl.check_script` (required if hitl set) — polled for the response.
- `hitl.artifact_source` (optional) — relative path from `run_dir` to
  artifact carrying issue frontmatter.
- `hitl.poll_interval` (default `60`) — seconds between polls.
- `hitl.timeout` (default `7200`) — max seconds to wait.
- `hitl.exclude_login` (optional) — login excluded from HITL replies.

## Node types

Common fields on every node:

- `type` (`"agent"|"loop"|"merge"|"human"`, required).
- `label` (string, required) — shown in logs.
- `inputs` (string[], optional) — DAG edges.
- `phase` (string, optional) — alternative to top-level `phases:`.
- `run_on` (`"always"|"success"|"failure"`, optional) — runs after main
  DAG. `run_always: true` is legacy alias for `run_on: "always"`.
- `before` / `after` (string, optional) — shell commands; templated.
- `settings` (object, optional) — overrides `max_continuations`,
  `timeout_seconds`, `on_error`, `max_retries`, `retry_delay_seconds`.
- `validate` (rule[], optional) — see Validation rules.
- `env` (`Record<string, string>`, optional) — node-level env vars merged
  over global `env`.

### `agent`

Invokes the AI IDE CLI. Required: `prompt`.

- `prompt` (string, required) — templated.
- `system_prompt` (string, optional) — appended via
  `--append-system-prompt`; templated. Use `{{file()}}` /
  `{{flow_file()}}` for reusable role files.
- `agent` (string, optional) — IDE-native subagent name (without `.md`).
- `model` / `effort` / `runtime` / `runtime_args` / `permission_mode`
  (optional) — override defaults.
- `allowed_paths` (string[], optional) — glob patterns the agent may
  modify. Mismatches inject a `scope_check` validation failure.
- `budget` / `allowed_tools` / `disallowed_tools` (optional) — REPLACE
  semantics across cascade; first-defined level wins, no merge.
- `memory_commit_deferred` (bool, default `false`) — opt out of the
  per-invocation memory-dirty check.

### `loop`

Required: `nodes`, `condition_node`, `condition_field`, `exit_value`.

- `nodes` (`Record<string, NodeConfig>`) — inline body nodes.
- `condition_node` (string) — body node whose output is inspected.
- `condition_field` (string) — frontmatter field matched against
  `exit_value`.
- `exit_value` (string) — value that terminates the loop.
- `max_iterations` (number, optional) — safety cap.

Validation: `condition_node` must be a key in `nodes`; if `>1` body node,
at least one body node must declare `inputs` referencing another body
node; body nodes referencing external inputs must list those inputs in
the loop's own `inputs`; if the condition node has a `validate` block, it
must include a `frontmatter_field` rule matching `condition_field`.

### `merge`

Combines outputs of multiple `inputs`. Only `merge_strategy: "copy_all"`
(default) is supported.

### `human`

Terminal prompt for manual input.

- `question` (string, required).
- `options` (string[], optional) — allowed responses.
- `abort_on` (string[], optional) — responses that abort the workflow.

## Validation rules

`validate` is an array of rule objects; common field: `path` (required;
empty only for engine-injected `scope_check`).

- `file_exists`, `file_not_empty`.
- `contains_section` — `value` (string) = heading text.
- `frontmatter_field` — `field` (string); `allowed` (string[], optional).
- `artifact` — composite; requires `sections` (string[]) or
  `fields` (string[]).
- `custom_script` — runs shell command `path`; exit 0 = pass.
- `scope_check` — engine-injected only when `allowed_paths` is set; do
  not declare manually.

## Phases

Two mutually exclusive mechanisms. Top-level:

```yaml
phases:
  planning: [spec, design]
  execution: [build, test]
```

or per-node `phase:` field. Mixing throws. Without phases, artifacts go to
`<run-dir>/<node-id>/`; with phases, `<run-dir>/<phase>/<node-id>/`.

## Template variables

Available in `prompt`, `system_prompt`, `before`, `after`, validation
paths, `prepare_command`:

- `{{node_dir}}`, `{{run_dir}}`, `{{run_id}}`.
- `{{input.<node-id>}}` — predecessor node's artifact dir.
- `{{args.<key>}}` — `--<key> <val>` CLI passthrough or `--prompt`.
- `{{env.<key>}}` — environment variable.
- `{{loop.iteration}}` — zero-based iteration counter (loop body only).
- `{{file("path")}}` — inlines file; path resolved against `workDir`.
  Single-pass; included content is not re-templated.
- `{{flow_file("path")}}` — same, resolved against the workflow folder.

`{{workDir}}` and `{{workflow_dir}}` are NOT template placeholders.
`{{file()}}` / `{{flow_file()}}` references in `prompt` / `system_prompt`
are validated at config load.

## CLI invocation

```
flowai-workflow run <workflow-folder> [flags]
```

Positional arg is the workflow folder (engine appends `/workflow.yaml`).
Only one positional argument is accepted.

Flags: `--prompt <text>`, `--resume <run-id>`, `--dry-run` (validate +
print plan; `--validate` does NOT exist), `-v|--verbose`,
`-s|--semi-verbose`, `-q|--quiet`, `--env KEY=VAL` (repeatable),
`--skip <ids>`, `--only <ids>`, `--budget <usd>`, `--skip-update-check`,
`--version|-V`, `--help|-h`. Unknown `--<key> <val>` flags become
`args.<key>`.

Other subcommands: `flowai-workflow init [--list]`.
