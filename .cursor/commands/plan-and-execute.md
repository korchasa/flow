---
description: Comprehensive workflow to Analyze, Plan (GODS), and Execute tasks with TDD
---

# Plan and Execute

## Overview
Perform a complete task lifecycle: Analyze the request, create a strategic plan in `whiteboard.md` using the GODS framework, and execute it using strict TDD.

## Context
<context>
End-to-end task resolution workflow combining architectural planning and rigorous engineering execution.
</context>

## Rules & Constraints
<rules>
1. **GODS Framework**: Plan MUST use Goal, Overview, Definition of Done, Solution structure.
2. **Strict TDD**: Write failing test first, then minimal implementation, then refactor.
3. **Whiteboard**: The `whiteboard.md` file is the single source of truth for the plan and progress.
4. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Phase 1: Analysis & Planning** Use `todo_write` tool:
   - Read `./documents` to understand context.
   - Create or update `./documents/whiteboard.md` with:
     - **Goal**: One sentence summary.
     - **Overview**: Context and approach.
     - **Definition of Done**: Measurable criteria.
     - **Solution**: Detailed steps.
   - *Constraint*: Do not start coding until the plan is clear.
2. **Phase 3: Execution (TDD)**
   - Follow the Solution steps from `whiteboard.md`. Use `todo_write`.
   - For each step:
     - Create/Update a test case (Red).
     - Implement minimal code to pass (Green).
     - Refactor and document (Refactor).
   - Update `whiteboard.md` to reflect progress (mark items as done).
3. **Phase 4: Quality Control**
   - Run `deno task check` to ensure no linting or type errors.
   - If the edits are related to the frontend, use `cursor-ide-browser` to check the functionality
   - Fix any issues found.
</step_by_step>

## Verification
<verification>
[ ] Mode switched to Plan initially.
[ ] `whiteboard.md` contains a valid GODS plan.
[ ] Changes are covered by tests (TDD).
[ ] `deno task check` passes cleanly.
[ ] `todo_write` was used to track progress.
</verification>
