---
date: 2026-05-21
status: done
implements: []
notes: "Historical record only. The flowai-workflow pack moved to the standalone repo korchasa/flowai-workflow; FR-WORKFLOW-ORCH and FR-WORKFLOW-SUPERVISOR were removed from this project's SRS."
---
# Workflow Orchestration Agents

## Goal

Add generic flowai-workflow orchestration and one-run supervision primitives with context isolation between policy choice and run recovery.

## Overview

### Context

The workflow pack can scaffold/adapt workflows and supervise a run, but it lacks a public long-cycle entry that chooses the next workflow from local policy and delegates each selected run to an isolated supervisor. Direct supervision should also be a thin public entry over the same supervisor agent so recovery behavior is consistent.

### Current State

- `framework/workflow/skills/flowai-scaffold/SKILL.md` handles setup/adaptation.
- `framework/workflow/skills/flowai-supervise/SKILL.md` owns run diagnostics inline.
- `framework/workflow/` has no agents.
- Existing acceptance scenarios cover generic supervision paths, but not delegation or orchestration policy.

### Constraints

- Keep instructions workflow-agnostic: no product examples or fixed workflow names.
- Orchestrator owns `.flowai-workflow/ORCHESTRATION.md`, workflow discovery, and append-only `.flowai-workflow/orchestration.jsonl`.
- Supervisor owns exactly one workflow/run, run artifacts, diagnosis, fix, and same-run resume.
- Orchestrator must not inspect deep run artifacts; supervisor must not interpret orchestration policy.
- Follow acceptance-test TDD for all skill and agent changes.

## Definition of Done

- [x] FR-WORKFLOW-ORCH: Public orchestration skill selects primary or maintenance workflow from local policy/history and delegates each selected run to the supervisor agent.
  - Test: `framework/workflow/skills/flowai-orchestrate/acceptance-tests/maintenance-cadence/mod.ts`
  - Test: `framework/workflow/skills/flowai-orchestrate/acceptance-tests/primary-before-maintenance/mod.ts`
  - Test: `framework/workflow/skills/flowai-orchestrate/acceptance-tests/missing-or-ambiguous-policy/mod.ts`
  - Test: `framework/workflow/skills/flowai-orchestrate/acceptance-tests/delegates-supervisor/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests --no-cache -f flowai-orchestrate`
- [x] FR-WORKFLOW-SUPERVISOR: Public supervision skill delegates one run to the supervisor agent; the supervisor diagnoses failed runs from artifacts, patches root cause, resumes the same run, and ignores orchestration policy.
  - Test: `framework/workflow/skills/flowai-supervise/acceptance-tests/delegates-supervisor/mod.ts`
  - Test: `framework/workflow/agents/flowai-supervisor/acceptance-tests/failed-run-resume/mod.ts`
  - Test: `framework/workflow/agents/flowai-supervisor/acceptance-tests/no-orchestration-policy/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests --no-cache -f flowai-supervise`
- [x] FR-WORKFLOW-ORCH, FR-WORKFLOW-SUPERVISOR: README, SRS, SDS, and workflow pack metadata describe the new generic primitives.
  - Test: `NO_COLOR=1 deno task check`
  - Evidence: `NO_COLOR=1 deno task check`

## Solution

1. Add RED acceptance scenarios for `flowai-orchestrate`, `flowai-supervise` delegation, and `flowai-supervisor`.
2. Add `flowai-orchestrate` as the public policy entry skill.
3. Convert `flowai-supervise` into a public wrapper that delegates exactly one workflow/run to `flowai-supervisor`.
4. Add `flowai-orchestrator` and `flowai-supervisor` agents under the workflow pack.
5. Update `framework/workflow/pack.yaml`, README, SRS, and SDS.
6. Run targeted acceptance tests without cache, then `deno task check`.
