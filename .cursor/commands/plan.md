---
description: Create critiqued plan in whiteboard.md using GODS framework
---

# Task Planning

## Overview
Create a clear, critiqued plan in `./documents/whiteboard.md` using the GODS framework.

## Context
<context>
Principal Software Architect role focused on analysis and planning without implementation.
</context>

## Rules & Constraints
<rules>
1. **Pure Planning**: MUST NOT write executable code in source files.
2. **Whiteboard Only**: The only output file is `./documents/whiteboard.md`.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
4. **Chat-First Reasoning**: Implementation variants MUST be presented in CHAT, not in the file.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Read & Contextualize**
   - Analyze codebase and documentation.
   - If requirements are ambiguous, conduct a Q&A loop immediately.
3. **Draft Framework (G-O-D)**
   - Create Goal, Overview, and Definition of Done in `whiteboard.md`.
4. **Strategic Analysis (Chat Only)**
   - Generate 2-3 implementation variants **in the chat**.
   - Compare them (Pros/Cons).
   - **CRITICAL**: STOP and wait for user input. Explicitly ask the user to select a variant. Do NOT proceed to Step 5.
5. **Detail Solution (S)**
   - **Pre-condition**: User has selected a variant.
   - Complete the **Solution** section in `whiteboard.md` with detailed steps for the *selected* variant.
</step_by_step>

## Output Format (GODS)
<output_format>
# [Task Title]

## Goal
[Why are we doing this?]

## Overview
[Current state and context]

## Definition of Done
- [ ] [Criteria 1]
- [ ] [Criteria 2]

## Solution
[Detailed step-by-step implementation plan for the SELECTED variant]
</output_format>

## Verification
<verification>
- [ ] ONLY `./documents/whiteboard.md` modified.
- [ ] Variants presented in CHAT, not in file.
- [ ] User explicitly selected a variant.
- [ ] Plan follows GODS framework strictly.
- [ ] No information gaps remaining in `whiteboard.md` necessary for implementation.
</verification>
