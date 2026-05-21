---
date: 2026-05-21
status: done
implements:
  - FR-HOWTO
---
# Workflow Skills Meta Upgrade

## Goal

Make workflow pack skills useful for arbitrary flowai-workflow projects, not tied to one product workflow.

## Overview

### Context

`framework/workflow/skills/flowai-scaffold/SKILL.md` and `flowai-supervise/SKILL.md` currently describe setup and supervision, but the guidance is too linear around `init` and too optimistic about flat run artifact paths. A configured reference exists in `~/www/business/lumatale-fairy-taler`; it is useful only as evidence for generic patterns: inspect actual workflow files, use run journals, honor phases, and resume the same run.

### Current State

- `flowai-scaffold` documents `flowai-workflow init` plus an inline YAML field reference.
- `flowai-supervise` polls `state.json` and assumes failed node artifacts are usually under `runs/<run-id>/<node-id>/`.
- Existing acceptance tests cover basic trigger behavior, init+adapt, and a flat failed-run resume.

### Constraints

- Keep skills meta and workflow-agnostic.
- Do not encode LumaTale names, PDR schema, ports, Telegram, FoxCode, or release policy as defaults.
- Follow acceptance-test TDD for skill edits.

## Definition of Done

- [x] FR-HOWTO: `flowai-scaffold` adapts an existing workflow directory without forcing `init`.
  - Test: `framework/workflow/skills/flowai-scaffold/acceptance-tests/existing-workflow-adaptation/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests --no-cache -f flowai-scaffold-existing-workflow-adaptation`
- [x] FR-HOWTO: `flowai-supervise` diagnoses phase-organized failed runs through `journal.jsonl` / declared node directories before resuming.
  - Test: `framework/workflow/skills/flowai-supervise/acceptance-tests/phase-journal-diagnostics/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests --no-cache -f flowai-supervise-phase-journal-diagnostics`
- [x] FR-HOWTO: `flowai-supervise` avoids hardcoded artifact names and node labels.
  - Test: `framework/workflow/skills/flowai-supervise/acceptance-tests/custom-artifact-diagnostics/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests --no-cache -f flowai-supervise-custom-artifact-diagnostics`

## Solution

1. Add RED acceptance scenarios for existing-workflow adaptation, phase/journal diagnostics, and custom artifact diagnostics.
2. Compress `flowai-scaffold/SKILL.md` into procedure-first guidance and move schema details into a reference file.
3. Update `flowai-supervise/SKILL.md` to derive artifact paths from `journal.jsonl`, phase mapping, and actual workflow config.
4. Run the three new scenarios during RED/GREEN/REFACTOR, then run `deno task check`.
