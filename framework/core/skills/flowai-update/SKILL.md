---
name: flowai-update
description: >-
  Update AssistFlow framework: sync skills/agents, detect convention changes, and migrate scaffolded project artifacts (AGENTS.md, devcontainer, deno.json, scripts/).
disable-model-invocation: true
---

# Task: Update AssistFlow Framework

## Overview

Single entry point for updating the AssistFlow framework in a project. Handles CLI update, skill/agent sync, and migration of scaffolded project artifacts. All migration intelligence comes from `flowai sync` output — no manual discovery needed.

## Context

<context>
AssistFlow generates two types of outputs:
- **Synced** (skills/, agents/) — updated automatically by `flowai sync`
- **Scaffolded** (AGENTS.md, .devcontainer/, deno.json tasks, scripts/check.ts, documents/) — created once by setup skills (flowai-init, flowai-setup-agent-*, flowai-skill-configure-deno-commands), then owned by the project

`flowai sync` outputs an `>>> ACTIONS REQUIRED` section listing exactly which skills changed and which scaffolded artifacts they affect. This skill follows those instructions.
</context>

## Rules & Constraints

<rules>
1. **Explicit sync only**: Never auto-sync. Always run `flowai sync` explicitly.
2. **Per-file confirmation**: Show diffs and ask user before modifying each scaffolded artifact. Never silently overwrite.
3. **Preserve user content**: Only update framework-originated sections. Do not touch project-specific customizations.
4. **No changes without evidence**: Only propose migrations when template diffs show relevant convention changes.
5. **Cross-IDE**: Must work for Cursor, Claude Code, and OpenCode projects.
6. **Mandatory tracking**: Use a task management tool (e.g., todo write) to track execution steps.
7. **Atomic commit**: Stage synced files + migrated artifacts together in one commit.
</rules>

## Instructions

<step_by_step>

1. **Update CLI**
   - Run `flowai --version`. It prints the current version and checks JSR for updates.
   - If not installed, inform the user: `deno install -gArf jsr:@korchasa/flowai` and stop.
   - If the output contains "Update available", run the update command shown in the output (e.g., `deno install -g -A -f jsr:@korchasa/flowai@X.Y.Z`).
   - After updating, run `flowai --version` again to verify.

2. **Sync framework**
   - Run `flowai sync -y --skip-update-check` via shell. Capture the full stdout output.
     - IMPORTANT: `sync` is a **subcommand** — always `flowai sync [flags]`, never bare `flowai [flags]`.
     - Bare `flowai` is blocked in IDE context and will print a help message instead of syncing.

3. **Parse sync output**
   - Look for `>>> ACTIONS REQUIRED:` section in the output.
   - If `>>> NO ACTIONS REQUIRED` appears with no actions section — report "Framework is up to date" and stop.
   - Extract each numbered action item:
     - **CONFIG MIGRATED**: Note that `.flowai.yaml` needs committing.
     - **SKILLS UPDATED**: Extract skill names and their `(scaffolds: ...)` lists.
     - **SKILLS CREATED/DELETED**: Note for commit message.
     - **AGENTS UPDATED**: Note for commit message.
     - **ERRORS**: Report to user and stop if critical.

4. **Migrate scaffolded artifacts**
   - For each SKILLS UPDATED entry that has scaffolds listed:
     a. Run `git diff` on the skill directory (e.g., `.claude/skills/flowai-init/`) to understand what changed in the template.
     b. For each scaffolded artifact path listed: compare the updated template directly against the project artifact using `git diff --no-index`:
        ```
        git diff --no-index -- .claude/skills/flowai-init/assets/AGENTS.template.md ./AGENTS.md
        ```
     c. Templates contain `{{PLACEHOLDERS}}` — ignore placeholder sections in the diff. Focus on **framework-originated sections** (rules, planning rules, TDD flow, doc formats, standard interface).
     d. Determine: does the project artifact contain all substantive content from the template? If yes — no migration needed. If no — record what's missing.
   - If no gaps found in any artifact — report only sync results and stop.

5. **Propose changes**
   - For each affected artifact, show:
     - What changed in the framework template (summary of diff)
     - Current state of the project artifact (relevant section)
     - Proposed update (preserving project-specific content)
   - Clearly explain **why** the change is recommended.

6. **Apply with confirmation**
   - Show per-file diff to the user.
   - Wait for user approval/rejection of each change.
   - Apply only approved changes.

7. **Commit**
   - Stage all synced files + migrated artifacts.
   - Commit with message: `chore(framework): update AssistFlow framework`
   - Include list of migrated artifacts in commit body.

</step_by_step>
