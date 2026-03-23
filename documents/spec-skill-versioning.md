# Spec: Skill Versioning

| Field   | Value      |
|---------|------------|
| Status  | Draft      |
| Created | 2026-03-21 |
| Updated | 2026-03-21 |

## Goal

Enable independent semantic versioning of individual skills so that users can pin
specific skill versions in their project config and safely receive targeted updates
without full framework upgrades.

## Overview

Currently, all skills are versioned implicitly via the CLI distribution version
(single `deno.json` version, e.g. `0.3.1`). Updating any skill forces users to
accept all framework changes. Only one skill (`flow-skill-example`) has an
experimental `version` field in its frontmatter; the CLI ignores it entirely.

The `.flowai.yaml` project config has an unused `version: "1.0"` field. Sync logic
uses binary content equality — no version-aware conflict resolution or constraint
matching exists.

This feature introduces per-skill semver versions tracked in SKILL.md frontmatter,
exposed in the CLI bundle metadata, surfaced through a lock file, and resolvable via
version constraints in `.flowai.yaml`.

## Non-Goals

- No backward compatibility with implicit (version-less) skills once migration is complete
- No hosted version registry / CDN — distribution remains bundle-only via JSR
- No multi-version co-installation (two versions of the same skill side-by-side)
- No automatic version bumping in CI/CD (human-owned versioning)
- No UI/TUI for version management — CLI only
- No per-agent versioning in this iteration (agents are out of scope)
- No rollback mechanism (revert via reinstall of older CLI version)

## Architecture & Boundaries

### Always (agent autonomy)

- Read and parse SKILL.md frontmatter `version` fields
- Read `.flowai.yaml` for skill version constraints
- Update `documents/spec-skill-versioning.md` phase status fields
- Run `deno task check` and `deno task test` to verify changes

### Ask First

- Changing the `.flowai.yaml` schema (breaking change for existing users)
- Introducing a `.flowai.lock` file (new file in user projects)
- Changing how conflicts are surfaced to the user during `flowai sync`
- Modifying the bundled.json schema

### Never

- Write implementation code (this is a spec document)
- Delete or rewrite existing test files without explicit instruction
- Change CLI distribution channel or JSR package identifier

## Definition of Done

- [ ] All skills in `framework/skills/*/SKILL.md` have a valid semver `version` field
- [ ] `bundle-framework.ts` extracts and indexes per-skill versions into `bundled.json` metadata
- [ ] `BundledSource` exposes version info for each skill
- [ ] `.flowai.yaml` accepts optional per-skill version constraints (semver range syntax)
- [ ] `flowai sync` respects version constraints: skips or warns when installed version satisfies constraint
- [ ] `.flowai.lock` records installed skill versions after each sync
- [ ] `deno task check` and all tests pass with no new warnings
- [ ] `documents/requirements.md` and `documents/design.md` updated with versioning requirements/design
- [ ] Benchmark scenario added covering version-pinning behavior
