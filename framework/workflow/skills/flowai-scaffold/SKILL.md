---
name: flowai-scaffold
description: Scaffold or adapt flowai-workflow DAGs in a project. Use for adding flowai-workflow, adapting an existing .flowai-workflow/<name>, validating workflow.yaml, or wiring agent prompts/scripts.
argument-hint: workflow folder path or target project path
effort: medium
---

# Scaffold flowai-workflow

Set up or adapt a `flowai-workflow` DAG in a repository. Stay meta: do not
assume product names, node names, artifact filenames, browser tools, HITL
transport, release policy, or a specific SDLC shape. Derive all decisions from
the workflow files and the target project.

For YAML field details, read `references/workflow-schema.md` only when editing
or validating `workflow.yaml`.

## Decide Mode

1. If the user names an existing `.flowai-workflow/<name>` folder, adapt that
   folder. Do not run `flowai-workflow init`.
2. If `.flowai-workflow/` exists but no workflow is named, list child folders
   and pick the only workflow. If several plausible workflows exist, ask which
   one to adapt.
3. If no workflow exists, use `flowai-workflow init --list` to inspect bundled
   workflows, choose the closest bundle from the user's goal, then run
   `flowai-workflow init --workflow <name>`.
4. If `init --list` fails because the installed package has no bundled
   `.flowai-workflow/` payload, diagnose the binary/install source. Do not
   invent a bundle list. Prefer a local engine checkout or prebuilt binary that
   actually contains bundled workflows.

## Existing Workflow Adaptation

For an existing workflow, inspect before editing:

- `.flowai-workflow/<name>/workflow.yaml`.
- `.flowai-workflow/<name>/agents/` prompts referenced by `system_prompt`,
  `{{file()}}`, or `{{flow_file()}}`.
- `.flowai-workflow/<name>/scripts/` used by validation, HITL, prepare, or
  failure hooks.
- `.flowai-workflow/<name>/memory/` conventions if configured by
  `defaults.memory_paths` or prompt text.
- `.flowai-workflow/<name>/.gitignore` and project `.gitignore` ignore rules.
- Project docs/configs that define commands, style, architecture, and runtime
  constraints (`AGENTS.md`, README, package manifests, task files, CI).

Adapt only placeholders and project-specific contracts the workflow already
declares. Do not graft in policies from another product. Keep node IDs,
artifact names, phases, and validation rules unless the user asked to redesign
the workflow or the current config is invalid.

Common adaptation targets:

- Runtime: `defaults.runtime`, `model`, `effort`, `permission_mode`,
  `runtime_args`.
- Commands: check/test/lint/build/deploy commands in prompts, `before`,
  `after`, `prepare_command`, validation scripts.
- Paths: repo-relative file references, `{{file()}}`, `{{flow_file()}}`,
  validation paths, memory paths, ignored run/memory artifacts.
- Agent role prompts: project context, allowed write surfaces, artifact
  contract, stop conditions, verification commands.
- HITL: ask/check scripts and timeouts only if the project has a real transport
  and required secrets/config.

## New Workflow Setup

1. Run `flowai-workflow init --list`.
2. Select a bundled workflow by intent, not by product name:
   - issue/backlog-driven SDLC -> GitHub inbox style bundle.
   - local autonomous implementation/review -> local SDLC style bundle.
   - runtime smoke check -> minimal test bundle.
3. Run `flowai-workflow init --workflow <name>` from the target project.
   Use `--dry-run` first when the user asked to preview writes.
4. Read the printed adaptation prompt, then adapt copied files using the same
   "Existing Workflow Adaptation" procedure.

`init` is a copy operation. It should not be treated as completion; the copied
workflow still needs project-specific prompts, commands, paths, and validation.

## Validate

After edits, validate the actual workflow folder:

```bash
flowai-workflow run .flowai-workflow/<name> --dry-run
```

Use the current CLI shape above. Do not use obsolete commands such as
`flowai-workflow validate` unless the installed binary's `--help` explicitly
documents them.

If dry-run fails:

- Schema/path/template error -> fix `workflow.yaml`.
- Missing referenced file -> create/adapt the referenced agent/script only if it
  is part of the workflow contract; otherwise correct the path.
- Runtime/tooling mismatch -> fix `runtime`, `model`, `runtime_args`, or prompt
  instructions.
- Missing secrets/external config -> report the blocker with exact variable or
  command name; do not invent credentials or fallback transports.

## Output

End with:

- workflow folder adapted or created;
- files changed;
- validation command and result;
- remaining manual requirements such as auth, secrets, or external services;
- exact run command, e.g. `flowai-workflow run .flowai-workflow/<name>`.
