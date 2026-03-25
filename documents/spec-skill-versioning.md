# Spec: Skill Versioning

| Field   | Value       |
|---------|-------------|
| Status  | Draft       |
| Created | 2026-03-25  |
| Updated | 2026-03-25  |

## Goal

Allow individual skills to declare a semver version in their SKILL.md frontmatter, and allow users to pin or constraint skill versions in `.flowai.yaml`. This enables:
- Reproducible environments (pin skill to known-good version)
- Gradual upgrades (opt-in to new skill versions)
- Framework authors to communicate breaking changes via version bumps

## Overview

**Current state:** Skills have no version field. Packs have `version` in `pack.yaml`, but individual skills are unversioned. The CLI installs all skills from the bundled snapshot indiscriminately. Users have no way to pin a specific skill to a known behavior.

**Why now:** The pack system (v1.1) is freshly shipped. Skills are stabilizing into reusable units. As the framework grows, breaking changes in skill behavior need a communication channel beyond pack-level versions. This is the natural next step after packs.

**Key insight:** Because the CLI bundles the entire framework into `bundled.json` at publish time, "loading a specific version" means either:
1. **In-bundle multi-version**: bundle contains multiple versions of a skill — complex, size-heavy.
2. **Version constraint validation**: CLI validates that installed skill version satisfies user's constraint, warns/errors on mismatch — lightweight, works with current architecture.
3. **Remote fetch by version**: fetch specific skill version from git tag/registry at sync time — adds network dependency (contradicts "zero network" design).

Option 2 is the most compatible with current architecture and should be the primary approach. Option 1 may be addressed in a future spec.

## Non-Goals

- No backward compatibility with pre-versioned skills (missing `version` field = treated as `0.0.0`)
- No UI or web dashboard for version management
- No multi-version coexistence in the bundle (single version per skill per release)
- No semver range expressions in pack.yaml (pack version stays independent)
- No migration of existing installed skills (no retroactive version metadata injection)
- No remote fetching of specific skill versions (preserves zero-network-dependency design)
- No agent versioning (agents.md files are out of scope for this spec)

## Architecture & Boundaries

### Always (agent autonomy)

- Add `version` field to SKILL.md frontmatter of any skill
- Read and parse `version` from skill frontmatter during sync
- Emit warnings for version constraint mismatches
- Update `FlowConfig` type to include optional `skill_versions` map
- Write tests for all new logic (TDD)
- Update `bundled.json` after framework changes via `deno task bundle`

### Ask First

- Change `.flowai.yaml` schema in a breaking way (e.g., rename existing fields)
- Add hard errors (not warnings) on version constraint violation — user may prefer soft failure
- Change the default behavior when `version` is absent from SKILL.md

### Never

- Add network calls to sync flow (preserves zero-network-dependency guarantee)
- Bundle multiple versions of the same skill simultaneously
- Skip `deno task check` after code changes

## Definition of Done

- [ ] All SKILL.md files in `framework/` have a `version` field (semver)
- [ ] CLI parses `version` from SKILL.md frontmatter during sync
- [ ] `.flowai.yaml` supports optional `skill_versions: { "skill-name": "^1.0.0" }` map
- [ ] Sync emits a warning when installed skill version does not satisfy constraint
- [ ] `FlowConfig` type updated, `config.ts` parses `skill_versions`
- [ ] `deno task check` passes (fmt + lint + all tests)
- [ ] Benchmark scenario for version constraint warning behavior passes
- [ ] Existing tests unchanged and passing

---

<!-- PHASES WILL BE ADDED AFTER USER APPROVAL OF DECOMPOSITION -->
