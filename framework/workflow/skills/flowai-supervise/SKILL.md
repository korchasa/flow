---
name: flowai-supervise
description: Supervise a flowai-workflow run. Launches `flowai-workflow run <workflow>`, polls runs/<run-id>/state.json every 30 s, and on node failure or stall diagnoses the root cause from artifacts, applies a fix to workflow.yaml or an agent prompt, then resumes via --resume. Use when asked to babysit a flowai-workflow run or iterate fix-and-resume autonomously.
argument-hint: workflow folder path (e.g., .flowai-workflow/github-inbox)
effort: high
---

# Supervised Workflow Run

## Overview

Drive a flowai-workflow to completion under live supervision. Loop:

1. Launch (or resume) `flowai-workflow run <workflow>` as a background
   subprocess; capture the `run-id`.
2. Every 30 seconds, read `<workflow>/runs/<run-id>/state.json`.
3. On `failed` or stall, collect evidence from
   `runs/<run-id>/<node-id>/`, diagnose the root cause, apply the smallest
   correct fix, resume with `--resume <run-id>`.
4. Stop on `completed`, or after three consecutive failed fixes on the
   same node — hand off with a written stop report.

## Context

<context>
Long-running workflows fail mid-flight for many small reasons: a prompt is
ambiguous, an artifact is malformed, a runtime CLI loses auth, an HITL
timeout fires. Restarting from scratch is wasteful — the engine's
`--resume <run-id>` skips completed nodes. This skill gives the agent a
mechanical loop for that diagnose-fix-resume cycle without escalating to
the user on every recoverable failure.
</context>

## Rules & Constraints

<rules>
1. **Background launch, foreground supervision.** Start the engine with
   Bash `run_in_background: true` so the agent stays responsive for the
   poll loop. Read the engine's stdout to capture the `Started run <run-id>`
   line (or read the newest directory under `<workflow>/runs/`).
2. **Poll cadence: 30 seconds.** Read `<workflow>/runs/<run-id>/state.json`
   once per cycle; no faster, no slower without explicit user override. Use
   `jq` over the file contents — do not write to it.
3. **Status semantics** (from the engine's `NodeStatus` and run-status
   unions):
   - `pending`, `running`, `waiting` → continue polling.
   - `waiting` typically means HITL is paused for a human reply. Do NOT
     fabricate a reply; leave the run alone unless the user asks otherwise.
   - `completed` → terminal success. Stop the loop, summarise.
   - `failed`, `aborted`, `scope_violation`, `hitl_timeout` → diagnose and
     attempt a fix (see below).
   - `running` for more than five consecutive polls on the same node with
     no progress (no new files in `runs/<run-id>/<node-id>/`) → treat as a
     stall, kill the subprocess, diagnose, fix, resume.
4. **Diagnose by 5 WHY.** Read the project's `AGENTS.md` "Diagnosing
   Failures" rule before applying any fix. Patch the root cause, not the
   symptom. Never edit a failing test to make it pass; never swallow an
   error to skip a node.
5. **Smallest correct fix.** Map symptom → fix surface:
   - Prompt misfire / wrong instruction → edit
     `agents/agent-<name>.md` or the inline `prompt:` in `workflow.yaml`.
   - Schema/wiring / validator-rule bug → edit `workflow.yaml`.
   - Validator script false-positive → edit the relevant `scripts/validate-*.ts`
     or `scripts/check-*.sh`.
   - Bug in the project under review → fix inside the worktree (commit if
     the workflow expects it).
   Touch one surface per attempt; resume after each, observe the next
   failure independently.
6. **Resume, do not restart.** Use
   `flowai-workflow run <workflow> --resume <run-id>` — same run-id, same
   worktree, completed nodes skipped. Only restart (fresh run) on user
   request; restarting loses artefacts.
7. **Termination.** Stop the supervise loop when:
   - `state.json.status` is `completed`; OR
   - the same node has failed three consecutive times despite three
     distinct fix attempts; OR
   - the user interrupts.
   Print a stop report: final state, list of fixes attempted, why each
   subsequent failure differed (or did not).
8. **Engine owns `state.json`.** Never edit it manually to coerce a run
   into looking complete. If state appears stuck, kill and resume.
9. **Task tracking.** Use a task management tool (e.g., TaskCreate /
   TaskUpdate) to record iteration state, fixes applied, and pending
   hypotheses so the trail is auditable.
</rules>

## Inputs

- **Argument (required):** workflow folder path (e.g.
  `.flowai-workflow/github-inbox`).
- **Optional flags forwarded to `flowai-workflow run`:** `--prompt <text>`,
  `--only <ids>`, `--skip <ids>`, `-v`. Do not forward `--dry-run` (it
  would defeat the purpose).

## Polling Implementation

Concrete shape (adapt to the active Bash tool):

```bash
# 1. Launch in background, capture run-id.
flowai-workflow run "$WORKFLOW" $FORWARDED_FLAGS &   # run_in_background: true
RUN_ID=$(ls -1t "$WORKFLOW/runs" | head -n 1)
STATE="$WORKFLOW/runs/$RUN_ID/state.json"

# 2. Poll loop (sleep is fine here — the loop is the work).
while :; do
  sleep 30
  STATUS=$(jq -r .status "$STATE" 2>/dev/null || echo "missing")
  case "$STATUS" in
    completed) echo "DONE"; break ;;
    failed|aborted|scope_violation|hitl_timeout)
      # diagnose, fix, resume below
      ;;
    *) continue ;;
  esac
done
```

Use `BashOutput` to drain the background process's log between polls
(noisy but useful when artefacts alone don't explain the failure).

## Diagnosis Playbook

Map common failure symptoms to evidence and likely root causes:

- **Validator failure** (`status: failed`, last node has a `validate:`
  block): look at `runs/<run-id>/<node-id>/` for the artefact the rule
  inspected. Frontmatter missing → fix the agent prompt that produced
  it. File missing → fix the prompt's `Output: {{node_dir}}/…` line or
  the validator's `path:`.
- **HITL timeout** (`status: hitl_timeout`): inspect
  `runs/<run-id>/<node-id>/hitl.log` (or the engine's stdout). Either the
  user did not reply, or `defaults.hitl.timeout` is too short. Bump the
  timeout in `workflow.yaml` or ask the user to reply.
- **Subprocess non-zero** (`status: failed` with no validator): the
  runtime CLI itself errored. Inspect the engine's stdout for stderr from
  `claude` / `opencode`. Common causes: auth expired, rate-limit, missing
  model alias. Re-authenticate the CLI, then resume.
- **`scope_violation`**: the node touched a path outside its declared
  `allowed_paths`. Inspect the diff in `runs/<run-id>/<node-id>/`. Either
  the prompt asked for an out-of-scope change (fix the prompt) or
  `allowed_paths` is too narrow (widen it).
- **Stall** (`running` ≥ 5 polls, same node, no new files): kill the
  background process, check the runtime is still alive, resume. If the
  same node stalls again, lower `defaults.timeout_seconds` so the engine
  kills it instead of hanging.

## Out of Scope

- First-time scaffolding of `.flowai-workflow/` — use `flowai-scaffold`.
- Post-mortem investigation of an already-finished run — use
  `flowai-investigate`.
- Editing the engine source itself — that is a fork-of-the-engine task.
