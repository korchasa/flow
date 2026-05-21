---
date: "2026-05-21"
status: done
implements:
  - FR-PACKS
  - FR-CMD-EXEC
  - FR-HOWTO
  - FR-DIST
  - FR-DIST.MARKETPLACE
  - FR-SKILL-COMPOSE
  - FR-ADAPT
  - FR-ACCEPT.TRIGGER
tags: [naming, commands, skills, agents, distribution, refactor]
related_tasks:
  - 2026/05/remove-flowai-prefix-from-skills-agents.md
  - 2026/05/claude-code-plugin-marketplace-pilot.md
  - 2026/05/codex-plugin-marketplace-support.md
  - 2026/05/generate-skills-from-atoms.md
  - 2026/05/simplify-update-boundaries.md
  - 2026/05/extract-cli-to-separate-repo.md
  - 2026/05/skill-trigger-benchmarks.md
  - 2026/05/trigger-n1-retry.md
---
# Remove `flowai-` Prefix from Framework Primitives

## Goal

Remove the redundant `flowai-` prefix from source-level framework command,
skill, and subagent names so pack/plugin namespaces carry branding while
primitive names stay short and stable across distribution channels.

## Overview

### Context

Framework primitives now live inside packs and are distributed through two
namespaced channels: the external `flowai` CLI bundle and native Claude Code /
Codex plugins. Plugin builds already strip `flowai-` from command and skill
names to avoid double-prefixed invocations such as
`/flowai:commit`. Keeping `flowai-` in source command, skill, and
agent names creates duplicate naming rules, noisy references, and migration
friction for every generated composite, acceptance scenario, validator, and
published pack.

### Current State

- `framework/<pack>/commands/*`, `framework/<pack>/skills/*`, and
  `framework/<pack>/agents/*.md` mostly use `flowai-*` names.
- Frontmatter `name:` values mirror the prefixed directory or file names.
- `scripts/check-naming-prefix.ts` requires `flowai-` on all primitive kinds.
- `scripts/check-trigger-coverage.ts` scans only skill directories whose names
  start with `flowai-`.
- `framework/composites.yaml` and atom/composite sources use prefixed atom IDs
  and target paths.
- Plugin build strips `flowai-` from command and skill output dirs today; after
  source names become short, this transform must become idempotent and still
  preserve plugin invocation shape.
- Acceptance scenario IDs and `skill` fields use prefixed primitive names.
- External `korchasa/flowai-cli` owns CLI sync, installed-resource ownership,
  orphan cleanup, and bundle consumption; this repo owns the framework contract
  those paths must satisfy.

### Constraints

- This is a workflow primitive change: acceptance-test TDD is required for any
  changed command, skill, or agent behaviour.
- Documentation must update before implementation: SRS, SDS, README, task
  links, and index entries must describe the new naming contract.
- Generated composite targets are build artefacts; edit
  `framework/atoms/*`, `framework/composites/*`, and
  `framework/composites.yaml`, then regenerate.
- The migration must preserve user-only command semantics:
  `commands/` remains the classifier and `disable-model-invocation: true` is
  still injected by writers/builders, not stored in source.
- No silent fallback from old names to new names unless selected explicitly as
  a migration compatibility strategy.
- Cross-repo CLI work cannot be implemented in this repo. Any required
  `korchasa/flowai-cli` changes must be recorded as an explicit external
  follow-up with acceptance evidence.

## Definition of Done

- [x] FR-PACKS: Source naming contract permits unprefixed command, skill, and
  agent primitive names while preserving kind classification by directory.
  - Test: `scripts/check-naming-prefix_test.ts::validateNamingPrefix: unprefixed primitives pass`
  - Evidence: `NO_COLOR=1 deno test -A scripts/check-naming-prefix_test.ts`
- [x] FR-CMD-EXEC: All framework command directories, `name:` frontmatter
  values, slash invocations, acceptance scenario `skill` fields, and docs are
  migrated from `flowai-*` to short names.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 find framework -mindepth 4 -maxdepth 4 -path 'framework/*/commands/flowai-*' -type d | wc -l` returns `0`
- [x] FR-HOWTO: All framework skill directories, `name:` frontmatter values,
  trigger scenario `skill` fields, cross-skill references, and docs are
  migrated from `flowai-*` to short names.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 find framework -mindepth 4 -maxdepth 4 -path 'framework/*/skills/flowai-*' -type d | wc -l` returns `0`
- [x] FR-PACKS: All framework subagent filenames and `name:` frontmatter values
  are migrated from `flowai-*` to short names, and parent skills reference the
  new names.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 find framework -mindepth 3 -maxdepth 3 -path 'framework/*/agents/flowai-*.md' -type f | wc -l` returns `0`
- [x] FR-SKILL-COMPOSE: Composite atom IDs, target paths, wrapper references,
  generated comments, and generated `SKILL.md` files use the selected short-name
  contract without leaking stale prefixed targets.
  - Test: `scripts/generate-skill-composites_test.ts::manifest_loads`
  - Evidence: `NO_COLOR=1 deno test -A scripts/generate-skill-composites_test.ts && NO_COLOR=1 deno run -A scripts/generate-skill-composites.ts --check`
- [x] FR-ACCEPT.TRIGGER: Trigger coverage scans all skills regardless of prefix
  and all renamed trigger scenarios keep valid `id` and `skill` fields.
  - Test: `scripts/check-trigger-coverage_test.ts::validateAllTriggerCoverage: scans unprefixed skill directories`
  - Evidence: `NO_COLOR=1 deno test -A scripts/check-trigger-coverage_test.ts && NO_COLOR=1 deno run -A scripts/check-trigger-coverage.ts`
- [x] FR-DIST.MARKETPLACE: Plugin build and validation treat source primitive
  names idempotently, keeping plugin namespace invocation shape stable after
  source names become short.
  - Test: `scripts/build-plugins_test.ts::skill-and-command-dirs-have-prefix-stripped`
  - Evidence: `NO_COLOR=1 deno test -A scripts/build-plugins_test.ts --filter 'skill-and-command-dirs-have-prefix-stripped|rewrites-cross-skill-slash-invocations|emits-agents' && NO_COLOR=1 deno task build-plugins`
- [x] FR-ADAPT: Adaptation workflows and adapters resolve renamed installed
  commands, skills, and agents according to the selected migration model.
  - Benchmark: `adapt-all`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests -f adapt-all --refresh-cache`
- [x] FR-DIST: CLI-side ownership, installed-resource cleanup, migration, and
  compatibility requirements are updated in this repo and tracked for
  `korchasa/flowai-cli`.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 rg -n 'short primitive names|unprefixed|orphan cleanup|migration' documents/requirements.md documents/design.md README.md`
- [x] FR-PACKS, FR-CMD-EXEC, FR-HOWTO, FR-DIST, FR-DIST.MARKETPLACE,
  FR-SKILL-COMPOSE, FR-ADAPT, FR-ACCEPT.TRIGGER: Full project verification is
  green after migration.
  - Test: `deno task check`
  - Evidence: `NO_COLOR=1 deno task check`

## Solution

Selected variant: **Variant 1 — atomic rename of all framework primitives**.

### Implementation Approach

Perform one repository-wide migration from prefixed source names to short names.
Use scripts for the mechanical rename and text rewrite, then reserve manual
review for ambiguous prose, user-facing compatibility text, and cross-repo
follow-ups.

This is a public breaking rename for framework primitives. After the migration,
CLI-installed and plugin-installed command/skill/agent names are short unless a
distribution layer explicitly documents a namespace (for example plugin pack
names remain `flowai`, while the primitive segment becomes `commit`, not
`commit`).

### Files to Modify

- `documents/requirements.md` — update FR-PACKS, FR-CMD-EXEC, FR-HOWTO,
  FR-DIST, FR-DIST.MARKETPLACE, FR-SKILL-COMPOSE, FR-ADAPT, and
  FR-ACCEPT.TRIGGER naming contracts; add this task back-pointer.
- `documents/design.md` — update §3.1.1 product pack naming, composite
  examples, marketplace output semantics, trigger coverage, and adaptation
  references.
- `README.md` — update pack catalog, invocation examples, command/skill/agent
  lists, and plugin namespace text.
- `framework/**/{commands,skills,agents}/` — rename primitive directories/files
  and frontmatter `name:` values.
- `framework/atoms/*.md`, `framework/composites/*.md`,
  `framework/composites.yaml` — rename atom keys, target paths, phase
  references, generated-origin comments, and examples.
- `scripts/check-naming-prefix.ts` and tests — replace the mandatory prefix
  rule with a short-name rule and keep `flowai-*` only where it denotes product
  namespace, marketplace pack name, or external CLI binary.
- `scripts/check-trigger-coverage.ts` and tests — scan all skill dirs and
  validate scenario `skill` fields against the new directory name.
- `scripts/build-plugins.ts`, `scripts/validate-plugins.ts`, and tests — make
  prefix stripping idempotent; emitted plugin skill dirs stay short.
- `scripts/acceptance-tests/lib/*` — update trace grouping, scenario discovery,
  and any helper assumptions that parse `flowai-*` scenario IDs.
- All `framework/**/acceptance-tests/**/mod.ts` — update scenario `id`,
  `skill`, `agent`, and explicit slash-invocation query text as required.
- `.gitignore` — update generated composite target paths if any generated
  `SKILL.md` location changes.

### Scripted Rename Plan

1. Build a deterministic rename map from current source primitives:
   - commands: `framework/<pack>/commands/flowai-<name>` ->
     `framework/<pack>/commands/<name>`;
   - skills: `framework/<pack>/skills/flowai-<name>` ->
     `framework/<pack>/skills/<name>`;
   - agents: `framework/<pack>/agents/flowai-<name>.md` ->
     `framework/<pack>/agents/<name>.md`.
2. Add a temporary migration script in `scripts/` or run a checked one-off Deno
   script during implementation that:
   - emits the rename map before writing;
   - fails on destination collision;
   - renames directories/files with `Deno.rename`;
   - rewrites exact identifiers in frontmatter, scenario fields, generated
     manifests, and code tests;
   - writes a report of unresolved `flowai-` references grouped by category.
3. Delete the temporary script before final commit unless it is promoted to a
   reusable validator. Keep the generated report only as terminal evidence, not
   as a committed artifact.
4. Use `rg 'flowai-'` after the script and classify every remaining hit:
   - keep: product name, CLI binary, plugin namespace, marketplace pack name,
     external repository names, historical task context;
   - rewrite: primitive identifier, directory path, scenario ID, frontmatter,
     slash invocation, validator assumption;
   - external: `korchasa/flowai-cli` follow-up text.
5. Run the migration in logical checkpoints even though it lands as one
   atomic implementation:
   - validator and builder support for short names;
   - command/skill/agent filesystem rename;
   - generated composite rename and regeneration;
   - acceptance scenario and cache-reference rename;
   - docs and external follow-up sweep.
   Each checkpoint must leave the targeted unit tests green before proceeding.

### TDD Sequence

1. **RED — naming validator**
   - Add failing tests to `scripts/check-naming-prefix_test.ts` showing
     unprefixed command, skill, and agent names pass while prefixed source
     primitive names fail.
   - Run `NO_COLOR=1 deno test scripts/check-naming-prefix_test.ts` and confirm
     failure before implementation.
2. **RED — trigger coverage**
   - Add failing tests to `scripts/check-trigger-coverage_test.ts` showing
     unprefixed skill dirs are scanned and stale `skill = "flowai-..."` fields
     are rejected.
   - Run `NO_COLOR=1 deno test scripts/check-trigger-coverage_test.ts` and
     confirm failure.
3. **RED — plugin idempotence**
   - Extend `scripts/build-plugins_test.ts` with a fixture that has unprefixed
     source command/skill dirs and asserts emitted plugin dirs remain short,
     slash rewrites remain namespaced, and agent files emit under short names.
   - Run the targeted test and confirm failure.
4. **GREEN — validators and builder**
   - Update naming, trigger, plugin build, plugin validation, acceptance
     discovery, and trace helpers until the new tests pass.
5. **GREEN — mechanical migration**
   - Run the scripted rename map over `framework/`, atoms, composites,
     acceptance tests, README, SRS, SDS, and script fixtures.
   - Regenerate generated composite `SKILL.md` files with
     `NO_COLOR=1 deno run -A scripts/generate-skill-composites.ts --write`.
6. **REFACTOR — reference audit**
   - Run `NO_COLOR=1 rg -n 'flowai-' framework scripts README.md documents`.
   - Rewrite every primitive-reference hit; keep only product namespace,
     marketplace, CLI, repository, or historical task references.
   - Run `NO_COLOR=1 deno fmt` after file moves and text edits.
7. **CHECK — project gate**
   - Run:
     - `NO_COLOR=1 deno test scripts/check-naming-prefix_test.ts`;
     - `NO_COLOR=1 deno test scripts/check-trigger-coverage_test.ts`;
     - `NO_COLOR=1 deno test -A scripts/build-plugins_test.ts`;
     - `NO_COLOR=1 deno run -A scripts/generate-skill-composites.ts --check`;
     - `NO_COLOR=1 deno run -A scripts/check-trigger-coverage.ts`;
     - `NO_COLOR=1 deno task build-plugins`;
     - `NO_COLOR=1 deno task check`.

### Acceptance-Test Strategy

- New or changed benchmark scenarios are required only where observable
  workflow behaviour changes, not for pure identifier churn.
- Run targeted acceptance scenarios locally for primitives whose behaviour or
  routing logic is touched:
  - `NO_COLOR=1 deno task acceptance-tests -f adapt` after the `adapt`
    command/skill identifiers are renamed;
  - `NO_COLOR=1 deno task acceptance-tests -f <renamed-trigger-scenario>` for
    one representative renamed skill trigger scenario;
  - `NO_COLOR=1 deno task acceptance-tests -f <renamed-command-scenario>` for
    one representative renamed command scenario.
- Hand off full primitive sweeps to the user after targeted scenarios pass:
  - `NO_COLOR=1 deno task acceptance-tests -f adapt`;
  - `NO_COLOR=1 deno task acceptance-tests -f <affected-primitive>` for every
    primitive with edited behavioural instructions.
- Acceptance cache migration:
  - if scenario IDs are renamed, move or invalidate matching cache entries under
    `acceptance-tests/cache/` using the same rename map;
  - do not leave stale cache entries that make old prefixed scenarios look
    current;
  - trace grouping helpers must render short IDs without re-adding `flowai-`.

### CLI Follow-Up

Record a required cross-repo task for `korchasa/flowai-cli` before marking
FR-DIST complete. Do not cut a framework release with short primitive names
until this external task is either implemented or explicitly documented as a
manual migration blocker for CLI users.

- CLI bundle reader must accept short source primitive names from
  `framework.tar.gz`.
- CLI sync ownership/orphan cleanup must not delete unrelated user primitives
  when old installed `flowai-*` resources and new short resources coexist.
- CLI migration should report stale prefixed installed resources and either
  remove only flowai-owned files or ask the user for explicit cleanup.
- CLI tests must cover sync from a framework snapshot with short primitive
  names.

### Error Handling

- Fail fast on rename destination collisions.
- Fail fast when any source SKILL.md `name:` differs from its directory name.
- Fail fast when any acceptance scenario `skill` or `agent` field points to a
  missing primitive after migration.
- Do not add runtime fallback from prefixed to unprefixed names unless the
  implementation discovers an existing installed-state compatibility blocker;
  if that happens, stop and create a separate explicit migration requirement.

### Verification Commands

```bash
NO_COLOR=1 deno test scripts/check-naming-prefix_test.ts
NO_COLOR=1 deno test scripts/check-trigger-coverage_test.ts
NO_COLOR=1 deno test -A scripts/build-plugins_test.ts
NO_COLOR=1 deno run -A scripts/generate-skill-composites.ts --check
NO_COLOR=1 deno run -A scripts/check-trigger-coverage.ts
NO_COLOR=1 deno task build-plugins
NO_COLOR=1 deno task check
```

Full acceptance-test sweep is intentionally handed off because renamed
primitives can span many scenarios and significant model cost. The implementer
must still run targeted RED/GREEN/REFACTOR scenarios for any primitive whose
observable workflow behaviour changes.
