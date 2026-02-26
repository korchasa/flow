# Global Framework Install/Update (FR-10)

## Goal

Enable one-command installation of AssistFlow skills and agents into user's IDE config directories. Remove friction: no manual file copying, no repo cloning required from user perspective.

## Overview

### Context

`scripts/install.ts` already implements a full interactive installer with per-item symlinks, plan/confirm UX, conflict detection, and stale symlink cleanup. But it only works **after cloning the repo** — `frameworkDir` is resolved relative to script location. FR-10.6 requires remote execution via `deno run -A <url>`.

Repo: `https://github.com/korchasa/flow`
Raw base: `https://raw.githubusercontent.com/korchasa/flow/main/`

### Current State

- `install.ts` — 527 lines, fully implemented for local mode
- Pure functions exported for testing (`discoverFramework`, `detectIDEs`, `computePlan`, `formatPlan`, `computeRelativePath`)
- `FsAdapter` interface for testability
- `deno task install` registered but undocumented in README

### Constraints

- Deno/TypeScript only (FR-10.7)
- Per-item symlinks, not directory symlinks (FR-10.1)
- No user data loss (FR-10.5)
- Idempotent (FR-10.3)
- macOS/Linux (Windows out of scope)
- `--uninstall` deferred to v2
- Simple shallow clone (no sparse checkout in v1)

## Definition of Done

- [ ] `deno run -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts` works from scratch
- [ ] Remote mode: auto-clones repo to `~/.assistflow/`, creates symlinks to IDE dirs
- [ ] `--update` flag: git pull + re-plan symlinks
- [ ] Local mode (from cloned repo) still works unchanged
- [ ] `install.sh` bootstrap: checks/installs Deno, delegates to install.ts
- [ ] README.md has Installation section
- [ ] Tests for new functions pass
- [ ] `deno task check` passes
- [ ] SRS FR-10 criteria updated, SDS section 3.5 updated

## Solution

### Architecture

```
Remote mode:
  deno run -A <raw-url>/install.ts
    → detect remote (import.meta.url starts with https://)
    → git clone --depth=1 https://github.com/korchasa/flow.git ~/.assistflow/
    → frameworkDir = ~/.assistflow/framework/
    → existing plan/confirm/execute flow

Local mode (unchanged):
  deno task install
    → frameworkDir = resolve(scriptDir, "..", "framework")
    → existing plan/confirm/execute flow

--update:
  git -C ~/.assistflow/ pull --rebase
  → re-run plan/confirm/execute
```

### New Functions in install.ts

- `isRemoteExecution(importMetaUrl: string): boolean` — check if running from URL
- `parseArgs(args: string[]): { update: boolean }` — flag parsing
- `resolveFrameworkDir(importMetaUrl: string, args: ParsedArgs): Promise<string>` — local vs remote resolution
- `ensureLocalClone(repoUrl: string, targetDir: string, update: boolean): Promise<void>` — git clone/pull

### install.sh (bootstrap, ~15 lines)

- Check `command -v deno`
- If missing: `curl -fsSL https://deno.land/install.sh | sh`
- `exec deno run -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts "$@"`

### Steps (TDD)

1. RED: write tests for `isRemoteExecution`, `parseArgs`, `ensureLocalClone`
2. GREEN: implement functions in install.ts, modify `main()`
3. REFACTOR: `deno task check`
4. Create `install.sh`
5. Update README.md — Installation section
6. Update SRS/SDS
7. Final `deno task check`
