# Extract Experiments Subsystem to Separate Repository

## Goal

Separate the experiments subsystem (`scripts/experiments/`, `scripts/task-experiment.ts`, related SRS/SDS/docs sections) from the `flow` repository into a standalone repository. Motivation: experiments are parameterized empirical studies of the agent platform (measuring model × IDE × memory characteristics). They are orthogonal to the framework product (skills/agents/commands) and to the benchmark regression suite. Keeping them inside `flow` bloats the product repo, couples release cycles, and confuses contributors about what is shipped to end users vs. what is internal research.

## Overview

### Current state (read from codebase)

- **Code location**: `scripts/experiments/` — ~2050 LOC (runner/judge/noise/report/tokens libs + `claude-md-length` variants + committed results).
- **CLI entry point**: `scripts/task-experiment.ts` (245 LOC), wired as `deno task experiment` in `deno.json` tasks.
- **Cross-dependencies on `scripts/benchmarks/lib/`** (hard imports from experiments → benchmarks):
  - `benchmarks/lib/adapters/{mod.ts,types.ts,claude.ts,cursor.ts}` — `AgentAdapter`, `MemoryScope`, `createAdapter`, `SUPPORTED_IDES`.
  - `benchmarks/lib/llm.ts` — `ModelConfig`, `IdeConfig`, `loadConfig`, `getIdeConfig`, `cliChatCompletion` (used by `judge.ts`).
  - `benchmarks/lib/spawned_agent.ts` — `SpawnedAgent` (lazy import in `runner.ts` default spawn function).
  - `scripts/utils.ts` — `ansi` helper.
- **Experiment-specific extensions in adapters**: `AgentAdapter.writeMemoryFile(scope, content)` and `AgentAdapter.getCleanroomEnv(configDir)` live in the benchmark adapter contract (`scripts/benchmarks/lib/adapters/types.ts`) but exist *solely* for the experiments subsystem (neither benchmark runner nor any other consumer uses them).
- **Config source**: `benchmarks/config.json` (default path in `loadConfig`). The experiment CLI currently reads it directly to pull judge model + default agent model.
- **SRS/SDS footprint in `flow`**:
  - `documents/requirements.md` §FR-EXP and §FR-EXP.MEMORY-LENGTH (≈25 lines).
  - `documents/design.md` §3.4a "Experiments Subsystem" (≈17 lines).
  - `documents/benchmarking.md` — experiment/benchmark comparison (~30 lines).
  - `documents/rnd/claude-md-length-empirical.md` — R&D write-up of the first experiment.
  - `README.md` directory-tree line 262–263.
- **`deno.json` touches**:
  - `tasks.experiment` entry.
  - `fmt.exclude` list includes `scripts/experiments/*/results/`.
- **Committed artifacts**: `scripts/experiments/claude-md-length/results/*.{md,json}` plus `.gitignore` in that dir (currently untracked).
- **Git state to plan around**: `documents/rnd/claude-md-length-empirical.md` is modified; `scripts/experiments/claude-md-length/results/.gitignore` is untracked.

### Why move now

- Experiments are the only consumer of `writeMemoryFile` / `getCleanroomEnv` / `SpawnedAgent` cleanroom env plumbing — shared code pretends to be "benchmark infra" but half of it is actually experiment infra.
- The committed `results/` directory will grow unbounded as new experiments land (per SDS §3.4a the JSON + MD are evidence, not regenerable). This inflates `git clone` for framework users.
- Running experiments needs a live `claude` CLI with real OAuth — framework CI does not (and should not) exercise this path. A separate repo lets experiment CI have its own secrets/runners.
- Contributors see `scripts/experiments/` and ask whether it's part of the product. Clear separation removes the ambiguity.

## Definition of Done

> Every item MUST be paired with a runnable verification command (per AGENTS.md Planning Rules — DoD Evidence).

- [ ] **New repo `flowai-experiments` created** with all experiments code, history-preserved where feasible, and it builds green on its own.
  - Evidence: `cd ../flowai-experiments && deno task check` exits 0.
  - Evidence: `cd ../flowai-experiments && deno task test` exits 0 (all runner/judge/noise/report/tokens tests pass).
- [ ] **New repo can run a smoke experiment end-to-end** with no dependency on the `flow` working tree.
  - Evidence: `cd ../flowai-experiments && deno task experiment claude-md-length --variant single-file --reps 1 --sizes 500 --rules format --dry-run` prints the plan without errors.
- [ ] **`flow` repo no longer contains experiments code or task**.
  - Evidence: `test ! -d scripts/experiments && test ! -f scripts/task-experiment.ts` (both absent).
  - Evidence: `grep -c '"experiment"' deno.json` returns 0.
  - Evidence: `grep -rn 'scripts/experiments' scripts documents cli README.md 2>/dev/null | grep -v whiteboards` returns nothing.
- [ ] **`flow` adapter contract is free of experiment-only methods** OR keeps them with a documented justification.
  - Evidence (if removed): `grep -n 'writeMemoryFile\|getCleanroomEnv' scripts/benchmarks/lib/adapters/types.ts` returns nothing.
  - Evidence (if kept): `documents/design.md` section that lists the method explains why the benchmark subsystem still exports it.
- [ ] **`flow` `deno task check` and `deno task test` remain green** after the removal.
  - Evidence: `deno task check` exits 0.
  - Evidence: `deno task test` exits 0.
- [ ] **`flow` `deno task bench` still works** (benchmark adapters untouched or adjusted without regressions).
  - Evidence: `deno task bench --list` prints the scenario catalog without errors.
- [ ] **SRS/SDS in `flow` reflect the removal**: FR-EXP / FR-EXP.MEMORY-LENGTH moved out or marked "relocated to <new-repo>"; SDS §3.4a replaced with a one-paragraph cross-reference; `documents/benchmarking.md` shortened to keep only the concept contrast (not the infra spec).
  - Evidence: `grep -n 'FR-EXP' documents/requirements.md` returns either zero matches OR only a stub that mentions the new repo URL.
  - Evidence: `grep -n '3.4a' documents/design.md` returns a cross-reference stub, not the original spec.
- [ ] **`README.md` directory-tree block updated** to drop `experiments/`.
  - Evidence: `grep -n 'experiments' README.md` returns nothing under the directory-tree section.
- [ ] **Git history**: decision on history preservation is explicit — either `git filter-repo`-preserved or clean-slate with a link back to the last `flow` commit that contained the code.
  - Evidence: `../flowai-experiments/README.md` has a "Provenance" section with the exact `flow` commit SHA.
- [ ] **New repo has its own CI** (format + lint + test) running green.
  - Evidence: GitHub Actions workflow green on first push.
- [ ] **Changelog/commit messages in `flow`** record the removal and link to the new repo URL.
  - Evidence: `git log --oneline -5` shows a commit referencing the split.

## Solution

**Strategy: Variant A — clean split with minimal adapter/LLM subset copied into `flowai-experiments`.**

Verified facts driving this plan (grepped 2026-04-11):
- `writeMemoryFile`, `getCleanroomEnv`, `MemoryScope`, `MemoryScopeNotSupportedError`, and the keychain helper `readClaudeOauthTokenFromKeychain` are consumed **only** by `scripts/experiments/**` and by their own adapter tests in `scripts/benchmarks/lib/adapters/{claude,cursor}_test.ts`. No benchmark runner or CLI consumer touches them. No `framework/**` benchmark scenario imports them either.
- `SpawnedAgent.env` (in `scripts/benchmarks/lib/spawned_agent.ts:8`) is a generic option, not experiment-specific — stays in `flow` as-is. `spawned_agent.ts` imports only `./adapters/types.ts` and `../../utils.ts` — tiny surface.
- `benchmarks/config.json` is shared by `task-bench.ts` and `task-experiment.ts`; each repo needs its own copy after the split.
- The `@bench/` import-map alias in `deno.json:28` points at `scripts/benchmarks/lib/` and re-exports `BenchmarkScenario`, `BenchmarkSkillScenario`, `BenchmarkAgentScenario`, `runGit`, `copyRecursive`, and LLM message types via `@bench/types.ts` / `@bench/utils.ts` — consumed by ~100 `framework/**/benchmarks/*/mod.ts` files. Crucially, **`@bench/types.ts` does NOT re-export `AgentAdapter` / `MemoryScope`** (verified by grep), so removing experiment-only members from `AgentAdapter` is not a breaking change for any `@bench/` consumer.
- `format_logs.ts` and the entire `trace*.ts` family are used only by `task-bench.ts` and `benchmarks/lib/runner.ts`, never by experiments or `spawned_agent.ts`. Confirmed non-copy.
- `scripts/utils.ts` imports only `@std/path` — safe to copy verbatim into the new repo.
- No CI workflow references `deno task experiment` (grep returned only source/docs hits). No GitHub Actions removal needed in `flow`.

### Phase 0 — preconditions (do these on `flow` first, before creating the new repo)

Goal: get `flow` green with the intended final structure minus the `scripts/experiments/` removal, so the split is a pure "delete + paste".

1. **Commit working-tree noise.** The session starts with `documents/rnd/claude-md-length-empirical.md` modified and `scripts/experiments/claude-md-length/results/.gitignore` untracked. Commit or stash them first — any bulk move on a dirty tree is a footgun.
   - Verify: `git status --porcelain` is empty.
2. **Capture the "golden baseline"**: run `deno task check` on `flow` at the current SHA and record the exit code + failing-test count. This is the reference to prove no regressions later.
   - Verify: `deno task check 2>&1 | tail -20` saved to `/tmp/flow-baseline.txt`.
3. **Hard-precondition greps** (must all return empty; if any match appears, STOP and re-scope):
   - `grep -rn 'writeMemoryFile\|getCleanroomEnv\|MemoryScope' framework scripts/benchmarks/lib/runner.ts scripts/benchmarks/lib/integration_test.ts cli` — confirms nothing outside `scripts/experiments/` and the adapter triplet (`types.ts`, `claude.ts`, `cursor.ts`, plus their tests) depends on experiment-only symbols.
   - `grep -rn 'FR-EXP' scripts framework cli --include='*.ts' --include='*.yaml' --include='*.sh'` — confirms no source-code traceability comment references the to-be-relocated FR-IDs. If any appears, `check-traceability.ts` will fail after Phase 2 unless the FR-ID stub stays in `requirements.md`; plan must adjust accordingly.
   - `grep -rn 'deno task experiment' .github/ ci/ 2>/dev/null` — confirms no CI job calls the task. (Already verified empty at planning time; re-check immediately before execution in case new CI jobs land.)

### Phase 1 — create `flowai-experiments` repo

1. **Init new repo** at `~/www/tools/flowai-experiments` (sibling of `flow` per `CLAUDE.md` tools-tree convention).
   - `deno.json` with: name `@korchasa/flowai-experiments` (unpublished initially — `"publish": {...}` omitted), tasks `check`/`test`/`experiment`, imports mirroring the subset actually used (`@std/path`, `@std/flags`, `@std/fs`, `@std/cli`, `@std/assert`).
   - `.gitignore` for Deno + `benchmarks/runs/`.
   - `README.md` with: one-paragraph purpose, link back to `flow` README section it replaces, "Provenance" section recording the exact `flow` commit SHA at time of split.
   - `AGENTS.md` (abridged): vision = "parameterized empirical studies of AI agent platforms", rules = same TDD/fail-fast/no-tables rules as flow, commands = `deno task check/test/experiment`.
   - `.github/workflows/ci.yml`: format check + lint + test (no experiment run — they need real CLI auth).
2. **Copy files** (verbatim, no edits yet):
   - `scripts/task-experiment.ts` → `scripts/task-experiment.ts`
   - `scripts/experiments/**` → `scripts/experiments/**` (all ~2050 LOC + `claude-md-length/results/`)
   - `scripts/utils.ts` (only the `ansi` helper is needed, but copy the whole file to avoid drift on an unrelated utility)
   - `benchmarks/config.json` → `benchmarks/config.json` (fresh copy; can diverge later with its own judge model defaults)
   - `documents/rnd/claude-md-length-empirical.md` → `documents/rnd/claude-md-length-empirical.md`
3. **Copy the minimal subset of `scripts/benchmarks/lib/`** needed at runtime. **Keep the directory name `scripts/benchmarks/lib/` in the new repo** — the name is ugly in a non-benchmark repo but the zero-edit path-preserving copy is worth it. A follow-up commit in `flowai-experiments` can rename it to `scripts/lib/runtime/` or similar once the baseline is green. Files to copy:
   - `adapters/types.ts` → kept intact (including `writeMemoryFile`/`getCleanroomEnv`/`MemoryScope`/`MemoryScopeNotSupportedError`).
   - `adapters/claude.ts`, `adapters/cursor.ts`, `adapters/mod.ts` → copied intact.
   - `adapters/claude_test.ts`, `adapters/cursor_test.ts` → copied intact (these tests test `writeMemoryFile` and now belong here).
   - `llm.ts` (`ModelConfig`, `IdeConfig`, `BenchmarkConfig`, `getIdeConfig`, `loadConfig`, `cliChatCompletion`, `ClaudeCliEvent` type).
   - `config_test.ts` (tests for `loadConfig`).
   - `types.ts` — **partial copy**: only `LLMMessage` and `LLMResponse` (lines 238–246). The `Benchmark*Scenario` classes stay in `flow`. Verify no experiment code touches `BenchmarkScenario` before deleting (grep).
   - `usage.ts` + `usage_test.ts` (imported transitively by `adapters/types.ts` via `SessionUsage`).
   - `spawned_agent.ts` + `spawned_agent_test.ts` (imported lazily by `runner.ts`).
   - `utils.ts` (helper used by `spawned_agent.ts` and tests). Verify its imports are `@std/*` only before copying — if it references `./benchmarks/lib/types.ts` for `BenchmarkScenario`, trim.
   - **NOT copied** (verified non-consumers): `format_logs.ts`, `format_logs_test.ts`, `trace.ts`, `trace-collector.ts`, `trace-renderer.ts`, `trace-styles.ts`, `trace-types.ts`, `trace_test.ts`, `integration_test.ts`, `runner.ts`, `runner_test.ts`, `judge.ts`, `template.ts`, `user_emulator.ts`. These serve the benchmark runner and stay in `flow`.
   - Re-verification command to run before the copy: `grep -rln 'format_logs\|trace-\|trace\.ts\|benchmarks/lib/runner\|benchmarks/lib/judge\|user_emulator\|template\.ts\|integration_test' scripts/experiments scripts/task-experiment.ts` — expect empty. If any line appears, the subset expands.
4. **Rewrite import paths** in the copied experiment files to point at the new path. Since the directory name is preserved (`scripts/benchmarks/lib/`), **no import rewrites are needed** inside `scripts/experiments/**` or `scripts/task-experiment.ts` — the relative paths (`../../benchmarks/lib/...`) still resolve. This is the core payoff of keeping the directory name.
5. **Rewrite imports inside the `benchmarks/lib/` subtree** — none required, internal imports are already relative (e.g. `adapters/claude.ts` → `./types.ts`, `spawned_agent.ts` → `./adapters/types.ts` and `../../utils.ts`).
6. **Config path resolution**: `loadConfig` default is `"benchmarks/config.json"` (CWD-relative). Keep this behavior in the new repo — both `deno task experiment` and `deno task test` run from the repo root, so it resolves. Document this as a hard constraint in the new repo's `scripts/CLAUDE.md`: "all tasks must be invoked from the repo root; CWD-relative config is intentional". A proper fix (resolve via `import.meta.url`) is **out of scope** for the split — it's a standalone improvement and mixing it in increases the chance of Phase 1 breakage.
7. **Verify new repo is green**:
   - `cd ~/www/tools/flowai-experiments && deno fmt --check` → exit 0.
   - `cd ~/www/tools/flowai-experiments && deno lint` → exit 0.
   - `cd ~/www/tools/flowai-experiments && deno task test` → exit 0, all runner/judge/noise/report/tokens/adapter tests pass.
   - `cd ~/www/tools/flowai-experiments && deno task experiment claude-md-length --variant single-file --dry-run` → prints plan, exit 0 (no CLI spawn on dry-run).
   - Smoke: one real trial — `deno task experiment claude-md-length --variant single-file --reps 1 --sizes 500 --rules format` → completes, writes `results/<today>-*.{json,md}`. This is the only step requiring live `claude` CLI + keychain; user runs it manually.
8. **Commit + push** to a freshly-created GitHub repo `korchasa/flowai-experiments`. Record the initial SHA.

### Phase 2 — remove experiments from `flow`

1. **Delete** (no code rewrites needed because nothing else references them):
   - `scripts/experiments/` (entire tree, including committed `results/`).
   - `scripts/task-experiment.ts`.
2. **Remove experiment-only members from the benchmark adapter contract.** Files to edit:
   - `scripts/benchmarks/lib/adapters/types.ts`: delete `writeMemoryFile` from `AgentAdapter`, delete `getCleanroomEnv` from `AgentAdapter`, delete `MemoryScope` type, delete `MemoryScopeNotSupportedError` class.
   - `scripts/benchmarks/lib/adapters/claude.ts`: delete `writeMemoryFile` method, delete `getCleanroomEnv` method, delete the private `readClaudeOauthTokenFromKeychain` helper (its only caller is `getCleanroomEnv`), delete the `MemoryScope`/`MemoryScopeNotSupportedError` imports.
   - `scripts/benchmarks/lib/adapters/cursor.ts`: delete `writeMemoryFile` method, delete `getCleanroomEnv` method, delete `MemoryScope`/`MemoryScopeNotSupportedError` imports.
   - `scripts/benchmarks/lib/adapters/claude_test.ts`: delete the three `writeMemoryFile` tests (`root`, `documents`, `overwrites existing`).
   - `scripts/benchmarks/lib/adapters/cursor_test.ts`: delete the two `writeMemoryFile` tests (`root writes .cursorrules`, `non-root throws`).
   - After editing, read each modified file to verify surrounding indentation is intact (per global CLAUDE.md rule about Edit tool whitespace).
3. **Update `deno.json`**:
   - Delete `"experiment": "deno run -A scripts/task-experiment.ts"` from `tasks`.
   - Delete `"scripts/experiments/*/results/"` from `fmt.exclude`.
4. **Update `documents/requirements.md`**: replace §FR-EXP and §FR-EXP.MEMORY-LENGTH content with a two-sentence stub pointing at `github.com/korchasa/flowai-experiments`. Keep the FR-IDs so traceability doesn't break silently — add a `- **Status:** relocated to <url> as of <date>` line under each.
5. **Update `documents/design.md`**: replace §3.4a body with a one-paragraph cross-reference: "Experiments subsystem lives in the `flowai-experiments` repo; see `github.com/korchasa/flowai-experiments` for infra and committed results. `flow` retains only the benchmark subsystem (§3.4)." Delete all references to `writeMemoryFile`/`getCleanroomEnv` from the adapter contract description.
6. **Update `documents/benchmarking.md`**: shorten to keep only the "Benchmark vs Experiment" concept contrast (a few lines); move the experiment-infra description to a one-line pointer at the new repo.
7. **Update `README.md`** directory-tree block (lines 262–263): remove the `experiments/` line and the parent infra mention.
8. **Update `documents/rnd/claude-md-length-empirical.md`**: either delete (the artifact now lives in `flowai-experiments/documents/rnd/`) or replace with a one-line redirect. Prefer delete — duplicated R&D notes drift.
9. **Run verification locally**:
   - `deno fmt` (auto-fix) then `deno fmt --check` → exit 0.
   - `deno lint` → exit 0.
   - `deno task test` → exit 0. Compare against `/tmp/flow-baseline.txt`: the **only** acceptable delta is a reduction in test count equal to the removed adapter tests (three `ClaudeAdapter - writeMemoryFile *` + two `CursorAdapter - writeMemoryFile *` = 5 fewer tests). Any other delta means something else broke — STOP per the Diagnosing Failures protocol, root-cause before proceeding.
   - `deno task check` → exit 0 (note per `scripts/CLAUDE.md`: the output always contains three `=== FAIL deno eval Deno.exit(...)` lines which are intentional test fixtures; read the final `N passed | M failed` summary, not the `=== FAIL` string).
   - `deno task bench --list` → prints scenario catalog, exit 0.
   - `grep -rn 'scripts/experiments' scripts documents cli README.md 2>/dev/null | grep -v whiteboards` → empty.
   - `grep -rn 'writeMemoryFile\|getCleanroomEnv\|MemoryScope\|readClaudeOauthTokenFromKeychain' scripts framework cli` → empty.
   - `grep '"experiment"' deno.json` → empty.
   - `grep -rn 'FR-EXP' scripts framework cli --include='*.ts' --include='*.yaml' --include='*.sh'` → still empty (same as Phase 0 precondition; re-run as a safety check after doc edits).
10. **Commit granularity**: the plan does NOT require a single commit — intermediate commits are allowed **as long as each commit leaves the tree green** (`deno task check` exits 0). Suggested split: one commit for the code deletions + adapter trim + `deno.json` task removal (largest mechanical change), one commit for the SRS/SDS/README updates. Each commit message must reference the new `flowai-experiments` repo URL and (in the first commit) the provenance SHA so `git log | grep experiment` surfaces the split point.

### Phase 3 — follow-ups (out of scope for this whiteboard, recorded as next-session tasks)

- Update `benchmarks/CLAUDE.md` / `AGENTS.md` in `flow` if they still mention experiments after Phase 2 edits.
- In the new repo, rename `scripts/benchmarks/lib/` → `scripts/lib/runtime/` (or similar) to remove the "benchmark" misnomer. Pure cosmetics; do it after the baseline is green.
- In the new repo, upgrade `loadConfig` to resolve `benchmarks/config.json` via `import.meta.url` so it stops depending on CWD.
- Drop the `judge` model entry from `flow`'s `benchmarks/config.json` if benchmark tests don't consume it (audit: `task-bench.ts` uses `ideConfig.judge` too — likely keep as-is).

**Note**: history preservation is NOT a Phase 3 decision. The DoD already requires a provenance SHA in `flowai-experiments/README.md`, and Phase 1 step 1 records it. Whether to use `git filter-repo --path scripts/experiments --path scripts/task-experiment.ts --path documents/rnd/claude-md-length-empirical.md` (preserves blame) or a clean-slate copy (simpler) is a decision made at Phase 1 execution time and recorded in the Provenance section either way.

### Risk & error-handling notes

- **Keychain access during smoke test**: `readClaudeOauthTokenFromKeychain` is macOS-only and can fail on new repos without a Claude session cached. If the Phase 1 live smoke run fails, do **not** add a fallback — stop and ask the user to authenticate (`claude login`) per the AGENTS.md "fail fast, fail clearly" rule. This is expected failure mode, not a blocker on the split itself.
- **`deno fmt` rewriting committed results**: `scripts/experiments/*/results/` is excluded from fmt in `flow` today (`deno.json:55`). The new repo's `deno.json` must mirror this exclusion to prevent fmt from rewriting the committed JSON. Verify by running `deno fmt` in the new repo and checking `git diff` is empty.
- **Lazy import path in `runner.ts`**: `defaultSpawnAgent` uses `await import("../../benchmarks/lib/spawned_agent.ts")` built from a string literal on line 362. Because the directory name is preserved in the new repo (per Phase 1 step 3), **no rewrite is needed** — but re-read that line post-copy to confirm the string matches the new layout.
- **Test-fitting anti-pattern**: do not edit `runner_test.ts` stub adapters to hide interface mismatches during migration. If a test fails after the move, it means the runtime copy is incomplete — fix the copy, not the test.
- **Intermediate commit greenness**: Phase 2 allows multiple commits, but each must leave the tree green. If the first commit removes interface members without also trimming the adapter implementations, the tree fails `deno task check`. Bundle interface+implementation+test removals into a single commit.
- **CI keychain absence**: `flowai-experiments` CI runs `check`/`test`, NOT `experiment` — the experiment task needs macOS keychain + live Claude auth which no CI runner has. Document this explicitly in the new repo's `README.md` under "Running locally vs CI".
- **CI test safety**: the copied adapter tests (`claude_test.ts`, `cursor_test.ts`) test `writeMemoryFile`'s file/symlink behavior via `Deno.makeTempDir` — no `claude` binary is spawned. Safe to run in GitHub Actions without secrets. Re-verify before wiring CI: `grep -n 'Deno.Command\|spawn' scripts/benchmarks/lib/adapters/claude_test.ts scripts/benchmarks/lib/adapters/cursor_test.ts` → expect no match.
- **Global-scope memory file is a known approximation**: `ClaudeAdapter.writeMemoryFile(scope="global")` writes to `<sandbox>/.claude-global/CLAUDE.md`, not the real `~/.claude/CLAUDE.md` (too dangerous to mutate). Any future experiment using `scope="global"` is measuring a simulated approximation, not the real global-memory loading path. Document this caveat in the new repo's `documents/design.md` — `flow`'s SDS has the note today (§3.4a), don't lose it.
- **`documents/benchmarking.md` trimming**: the file currently has `Experiments` content spanning lines 8–16 (concept contrast — KEEP, it's context for flow's own benchmark subsystem) and lines 108–~165 (experiment infra spec — DELETE, the new repo owns it). Replace deleted block with a one-line pointer: `See github.com/korchasa/flowai-experiments for experiments infrastructure, CLI, and committed results.`
- **No CI jobs reference the task**: verified at planning time via `grep -rn 'deno task experiment' .github/` — empty. Re-verify immediately before Phase 2 in case new CI jobs land between planning and execution.
