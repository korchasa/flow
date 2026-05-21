---
name: orchestrate
description: Run the flowai-workflow orchestration policy loop. Delegates policy execution to the workflow orchestrator agent, which selects workflows from ORCHESTRATION.md and supervisor summaries.
argument-hint: optional .flowai-workflow path or loop limit
effort: high
---

# Workflow Orchestration Entry

Start or continue a project-local `flowai-workflow` orchestration loop. This is
the public entry point and dispatch bridge. Policy decisions belong to
`orchestrator`; run recovery belongs to
`supervisor`.

## Dispatch Loop

1. Launch `orchestrator` with the host's real subagent
   mechanism:
   - Claude Code: use the `Agent` / `Task` tool with
     `subagent_type=orchestrator`;
   - OpenCode: use the `@orchestrator <task prompt>` mention
     syntax.
2. Ask it to read policy/history, append its decision, and return either:
   - `STOP: <reason>`; or
   - a `SUPERVISOR_DELEGATION` block with workflow path, optional run id,
     reason, and requested short-result fields.
3. If it returns `SUPERVISOR_DELEGATION`, launch `supervisor`
   from the parent context using the real subagent mechanism:
   - Claude Code: `Agent` / `Task` with
     `subagent_type=supervisor`;
   - OpenCode: `@supervisor <task prompt>`.
4. Pass the supervisor only one workflow/run and ask for a short result:
   `workflow`, `run_id`, `status`, `fixes`, `repeat`, `blocker`.
5. Feed that short result into the next orchestrator call if the policy loop
   should continue. Stop when the policy stop condition, supervisor blocker, or
   user loop limit is reached.

Pass the orchestrator:

- the user's request;
- repository root;
- optional loop limit, if the user gave one;
- prior supervisor summary, when continuing after a supervised run;
- instruction to return concise progress plus a structured delegation block.

If the current IDE has no native subagent dispatch, say that context-isolated
orchestration is unavailable in this IDE and stop. Do not inline the loop in the
parent context. Do not simulate delegation with `bash`, `echo`, heredocs, or
placeholder text.

## Parent Boundaries

The parent session may identify that `.flowai-workflow/` exists, but must not:

- choose workflows by policy;
- read `.flowai-workflow/ORCHESTRATION.md` deeply;
- read workflow `runs/`, `state.json`, `journal.jsonl`, `logs/`, or node
  artifacts;
- patch workflow files;
- run `flowai-workflow` directly for a selected workflow.

Those actions belong to the orchestrator subagent and, for a single run, the
supervisor subagent. The parent only dispatches between them because some hosts
do not allow nested subagent calls.

## Expected Subagent Result

Ask the orchestrator to report:

- decisions appended to `.flowai-workflow/orchestration.jsonl`;
- selected workflows, supervisor delegation requests, and supervisor run ids;
- final stop condition or next pending action;
- blockers requiring a real user decision.
