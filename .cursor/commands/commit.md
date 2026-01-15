---
description: Guided commit workflow following Conventional Commits and repository rules
---

# Commit Workflow

## Overview
Guided flow to prepare, commit, and publish changes following Conventional Commits (strict) and repository rules.

## Context
<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system in `./documents`. All changes must be reflected in the documentation.
</context>

## Rules & Constraints
<rules>
1. **Strict Commits**: Compose the message in **English** per Conventional Commits 1.0.0 (Strict Profile).
2. **Git Pager**: All git commands must disable pager by setting `GIT_PAGER=cat`.
3. **Logical Grouping**: If changes are not logically related (e.g., refactoring mixed with features), group them and **ask the user for permission** to create multiple commits.
4. **Inclusion Policy**: Automatically include all verified non-PII changes. **DO NOT** ask for selection unless potential PII is detected or splitting changes.
5. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Pre-flight checks**
   - Run `deno task check` if the project wasn’t checked since the last modification.
   - Review `./documents` tree and catalogue facts that need reflection.
   - Inspect changes since last commit using `GIT_PAGER=cat git diff` (staged and unstaged).
3. **Workspace sync**
   - Update docs under `./documents` (excluding `whiteboard.md`) to reflect current project state in **English**.
   - Apply combined extractive/abstractive summarization.
   - Keep content compact (lists, tables, YAML, Mermaid).
4. **Change Analysis & Grouping**
   - Analyze all changes to determine if they belong to a single logical unit.
   - **If unrelated changes are detected**:
     - Group files by logical intent (e.g., "Refactor", "Feat: Auth", "Docs").
     - **ASK THE USER** for permission to split into multiple commits: "I see changes that look unrelated. Shall I split them into X commits? [List plan]".
     - Wait for confirmation.
   - If related or user denies split, proceed with a single commit.
5. **Commit execution**
   - **For each** defined commit group (or the single group):
     - Stage the relevant files for this group.
     - Compose the message in **English** per Conventional Commits.
     - Verify type, scope, header length, body wrapping, and footers.
     - Create the commit.
6. **Publish**
   - Push the commit(s) to GitHub.
   - If not on `main`, create a pull request via `gh pr create` and share the link.
</step_by_step>

## Verification
<verification>
- [ ] Project checked with `deno task check`.
- [ ] `./documents` reviewed and updated to reflect current state.
- [ ] Changes analyzed for logical grouping.
- [ ] User asked for permission if multiple commits proposed.
- [ ] Commits comply with Conventional Commits (strict).
- [ ] PR created and link shared (if not on `main`).
</verification>
