# Create GitHub Issue

## Overview
Generate a high-quality issue describing the task/problem with clear DoD and option analysis, then create it on GitHub.

## Todo List
1. **Preparation**
   - Read `./documents`
   - Analyze and restate the user request

2. **Information gathering**
   - Collect all related info: source files, libraries, web, `.documents/remote_resources.md`

3. **Issue drafting (temporary file)**
   - Goal: why we do it
   - Overview: current state and context
   - Definition of Done: acceptance criteria
   - Solution: atomic subtasks list
   - Implementation options: aggressive, conservative, balanced; pros/cons; short/long-term consequences; comparison and selection strategy; optimal option

4. **Critique and refine**
   - Self-review and improve the draft

5. **Create issue**
   - Use `gh issue create` with proper title, description, labels
   - Delete the temporary file

## Checklist
- [ ] Context analyzed and restated
- [ ] All sources collected and reviewed
- [ ] Issue draft includes Goal/Overview/DoD/Solution/Options
- [ ] Draft refined after critique
- [ ] GitHub issue created with metadata
- [ ] Temporary file removed
