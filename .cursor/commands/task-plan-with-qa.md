---
description: Create critiqued plan in whiteboard.md with options analysis and Definition of Done
---

# Task Planning

## Overview
Create a clear, critiqued plan in `./documents/whiteboard.md` with options analysis and DoD, then stop for execution.

## Always
- On <STOP> command, MUST stop the planning and MUST wait for user input.
- MUST NOT write any code, test, or documentation during planning phase.
- MUST use the user's query language for all conversation and the plan.
- MUST NOT edit any files in the project except `./documents/whiteboard.md`.

## Todo List
1. **Read all docs in `./documents`**
2. **Analyze and restate the user query**
If the user query contains an internal contradiction, tell the user about it and ask them to resolve it.
3. **Collect all relevant key points in user query**
   - Analyze the codebase
   - Make a search on the internet
4. **Conduct a Q&A session** regarding missing information and <STOP> for user input.
When the user answers, proceed to step 5.
5. **Plan drafting in `whiteboard.md`**
   - Goal: Why are we performing the task? What is the business goal?
   - Overview: What is happening now? Why did the task arise? What is happening around it?
   - Definition of Done: acceptance criteria (include "`./run check` without errors and notices")
   - Resolution options: Generate 3-5 implementation variants with pros/cons, short/long-term consequences, comparison and selection strategy, recommendation of the best option (but not final selection).
6. **Critique the plan(goal, overview, DoD and options) directly in `whiteboard.md`**
7. **Rewrite the plan(goal, overview, DoD and options) in `whiteboard.md` considering the critique**
8. **Remove the old plan version and critique from `whiteboard.md`**
9. **Ask user to select the optimal resolution option and <STOP> for user input** 
Ask user to confirm the recommended option or choose another! Do not select the final option by yourself, ask user to select it!
10. **Delete the unselected options**
11. **Conduct a Q&A session** regarding the details of the selected option if needed and <STOP> for user input.
12. **Elaborate in detail on the option selected by the user**.
13. **<FULL_STOP>**

## Checklist
- [ ] Language set according to user query language
- [ ] Relevant documentation read
- [ ] Query restated
- [ ] Facts gathered from all sources
- [ ] Q&A session conducted and user input received
- [ ] Plan drafted with Goal/Overview/DoD/Options
- [ ] Resolution options created with pros/cons, consequences, strategy, and recommendation
- [ ] Resolution options critiqued and rewritten
- [ ] Optimal resolution option selected by user
- [ ] All other resolution options removed from the file
- [ ] Q&A session regarding selected option details conducted
- [ ] no open questions without answers
- [ ] no unselected resolution options
- [ ] Planning phase completed (stop)
