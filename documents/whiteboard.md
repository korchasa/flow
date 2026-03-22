# Benchmark Coverage: Remaining Work

## Goal

Pass rate >= 90%. Estimated current: ~58/61 (~95%) after fixes. Need full run to confirm.

## TODO

### 1. Full benchmark run to confirm pass rate

Run all scenarios and verify actual numbers after all fixes:
- P1–P5 fixes applied
- P6 deterministic bugs fixed
- ai-skel-ts removed, playwright-cli → browser-automation, github-tickets-by-mcp → github-tickets
- `deno task bench` (full run, no filter)

### 2. Flaky scenarios (3 remaining, LLM variance)

These pass sometimes, fail sometimes — true non-determinism:
- `flow-skill-cursor-agent-integration-parse-json`: agent sometimes doesn't parse fixture correctly
- `flow-skill-engineer-skill-basic`: code generation from scratch, high variance
- `flow-skill-engineer-subagent-basic`: code generation from scratch, high variance

Options:
- (a) Run with `--runs 3`, use majority threshold (already implemented in task-bench.ts)
- (b) Investigate specific failure modes per scenario and tighten skills/prompts
- (c) Accept as flaky — these test creative generation, variance is expected

### 3. Add .gitignore to remaining commit scenarios

Applied to basic/check/deps. Still need for: atomic-hunk, atomic-docs, atomic-refactor, sync-docs, consolidate, check-fail. All use `git add .` which commits `.claude/`.

### 4. flow-skill-example validation error

`check-skills.ts` reports: `flow-skill-example: Unrecognized key(s) in object: 'version'`. Pre-existing, not related to benchmark work. Fix or remove `version` key from frontmatter.
