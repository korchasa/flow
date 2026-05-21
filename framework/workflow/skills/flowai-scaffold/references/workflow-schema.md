# flowai-workflow schema reference

Use this when editing `workflow.yaml`. Keep behavior generic and derive concrete
contracts from the local workflow.

## CLI

```bash
flowai-workflow init [--workflow <name>] [--dry-run] [--allow-dirty]
flowai-workflow init --list
flowai-workflow run <workflow-folder> [flags]
```

`run` accepts one positional workflow folder. The engine appends
`/workflow.yaml`.

Common run flags: `--prompt <text>`, `--resume <run-id>`, `--dry-run`,
`--skip <ids>`, `--only <ids>`, `--env KEY=VAL`, `--budget <usd>`,
`--cycles <N>`, `--skip-update-check`, `-v`, `-s`, `-q`, `--help`,
`--version`.

## Top-level fields

- `name` string, required.
- `version` string, required, currently `"1"`.
- `defaults` object, optional.
- `env` object, optional, available as `{{env.<key>}}`.
- `nodes` object, required.
- `phases` object, optional, `Record<phase, nodeId[]>`.

`pre_run` is removed. Use `defaults.prepare_command` for pre-loop setup or
`defaults.worktree_disabled: true` to opt out of engine worktrees.

## Defaults

Execution:

- `worktree_disabled` bool, default `false`.
- `max_parallel` number, default `0`.
- `prepare_command` string, templated, skipped on resume.
- `on_failure_script` string.

Runtime:

- `runtime`: `claude`, `opencode`, `cursor`, or `codex`.
- `runtime_args`: map of CLI flags. String value means flag value, `""` means
  boolean flag, `null` suppresses inherited flag.
- `permission_mode`: runtime permission mode. `opencode` and `cursor` support
  only `bypassPermissions`.
- `model` string.
- `effort`: `minimal`, `low`, `medium`, `high`.

Node settings:

- `max_continuations`, `timeout_seconds`, `on_error`, `max_retries`,
  `retry_delay_seconds`.

Budget/tools/memory:

- `budget.max_usd`, `budget.max_turns`.
- `allowed_tools` or `disallowed_tools`, mutually exclusive at each cascade
  level. Do not also pass equivalent tool flags through `runtime_args`.
- `memory_paths` glob list. Dirty matching files fail agent nodes unless the
  node sets `memory_commit_deferred: true`.

HITL:

- `hitl.ask_script`, `hitl.check_script`.
- Optional `artifact_source`, `poll_interval`, `timeout`, `exclude_login`.

## Node common fields

- `type`: `agent`, `loop`, `merge`, or `human`.
- `label` string.
- `inputs` node IDs.
- `phase` string. Do not mix with top-level `phases`.
- `run_on`: `always`, `success`, or `failure`.
- `before`, `after`, `settings`, `validate`, `env`.

## Agent nodes

Required: `prompt`.

Optional: `system_prompt`, `agent`, `model`, `effort`, `runtime`,
`runtime_args`, `permission_mode`, `allowed_paths`, `budget`, `allowed_tools`,
`disallowed_tools`, `memory_commit_deferred`.

## Loop nodes

Required: `nodes`, `condition_node`, `condition_field`, `exit_value`.

Optional: `max_iterations`.

The condition node must be inside the loop body. If it has validation, include a
`frontmatter_field` rule for `condition_field`. Body nodes that depend on
external nodes must expose those dependencies through the loop node's `inputs`.

## Merge and human nodes

`merge` supports `merge_strategy: copy_all`.

`human` requires `question`; optional `options` and `abort_on`.

## Validation rules

Each rule has `type`; most have `path`.

- `file_exists`
- `file_not_empty`
- `contains_section` with `value`
- `frontmatter_field` with `field` and optional `allowed`
- `artifact` with `sections` or `fields`
- `custom_script`
- `git_worktree_clean`
- `git_default_branch_checked_out`
- `scope_check` is engine-injected; do not declare it manually.

## Templates

Available in prompts, commands, and validation paths:

- `{{node_dir}}`, `{{run_dir}}`, `{{run_id}}`
- `{{input.<node-id>}}`
- `{{args.<key>}}`
- `{{env.<key>}}`
- `{{loop.iteration}}`
- `{{file("path")}}`, resolved against project work dir
- `{{flow_file("path")}}`, resolved against workflow folder

`{{workDir}}` and `{{workflow_dir}}` are not placeholders.
