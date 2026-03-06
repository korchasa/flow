# Deep Research Skill: Playwright-CLI Based Architecture with Iterative Research Loop

## Goal

Redesign `flow-skill-deep-research` to implement a full deep research agent architecture: iterative research loop with gap analysis, scratchpad-based state management, selective extraction, self-reflection, and playwright-cli as the primary search/fetch mechanism. Increase research depth (search→fetch→extract→reflect→repeat) while maintaining citation provenance and context budget control.

## Overview

### Context

- `@framework/skills/flow-skill-deep-research/SKILL.md` — current skill (5 phases: detect method → plan → sequential workers → escalate → synthesize)
- `@framework/skills/flow-skill-playwright-cli/SKILL.md` — browser automation skill (open/goto/snapshot/click/fill/type)
- `@framework/agents/{opencode,cursor,claude}/deep-research-worker.md` — worker sub-agent (3 IDE variants, identical logic)
- `@framework/skills/flow-skill-deep-research/assets/report_template.md` — output format templates

Current skill has Phase 0 (search method detection) that treats playwright-cli as one of 4 fallback methods. Workers do a single-pass: run all queries → evaluate → extract → save. No iterative loop, no centralized scratchpad, no gap analysis within a direction.

### Pain points

- **No iterative research loop**: worker searches once, no "what's still unknown?" cycle → shallow coverage
- **No scratchpad/state machine**: facts scattered across per-direction temp files, no centralized plan/completed/pending/facts/contradictions tracking
- **No selective extraction**: workers fetch full pages and extract everything → context waste, irrelevant noise
- **No outline as research anchor**: planning produces directions but no report outline → synthesis has no structure to fill
- **No dependency graph**: directions treated as independent → can't sequence "learn X before researching Y"
- **playwright-cli is a fallback, not primary**: Phase 0 prefers built-in search, playwright-cli is priority 2
- **No within-direction iteration**: worker does one pass; if coverage insufficient, only orchestrator-level escalation with retry
- **Citation drift risk**: hierarchical temp files → synthesis → report chain can lose source attribution
- **No loop termination heuristic**: escalation is binary (score < 6.0 → retry once), no soft signal from gap analysis

### Current State

**SKILL.md (235 lines):**
- Phase 0: detect search method (built-in > playwright-cli > playwright-mcp > other MCP)
- Phase 1: decompose into 3-6 directions with queries + acceptance criteria
- Phase 2: launch workers sequentially, post-worker review (4 checks: sources ≥2, coverage, confidence, no fabrication)
- Phase 3: escalation if direction score < 6.0 (retry once with alternative queries)
- Phase 4: synthesis (read all temp files, group thematically, merge, label FACT/SYNTHESIS, cite)
- Phase 5: output (save report, verify integrity, print summary, cleanup)

**Worker sub-agent (133 lines, 3 IDE variants):**
- 7 steps: search → evaluate (authority 0-5) → fetch top 3-5 → extract facts → note contradictions → note gaps → save
- Single pass, no iteration
- Saves structured markdown to `_research_tmp/<slug>.md`

**Playwright-CLI skill:**
- Commands: open, goto, snapshot, screenshot, click, fill, type, press, eval
- Snapshot = accessibility tree (preferred over screenshot for AI reasoning)
- Session management via `-s=name`

### Constraints

- Multi-IDE: Cursor, Claude Code, OpenCode. No IDE-specific tool names in skill text.
- Workers MUST NOT spawn sub-agents (existing invariant, keep it)
- Max 6 directions (existing invariant, keep it)
- playwright-cli must be the primary search/fetch engine (user requirement)
- Other search methods remain as fallbacks (preserve backward compat)
- Report format (`assets/report_template.md`) stays compatible
- All changes must be tested through benchmarks
- Skill must remain a single SKILL.md (no TypeScript code in the skill itself)

## Definition of Done

- [ ] SKILL.md rewritten with iterative research loop architecture (search → fetch → extract → update scratchpad → gap analysis → repeat)
- [ ] Scratchpad state machine defined (plan, completed, pending, facts, contradictions, draft_sections)
- [ ] Selective extraction: worker knows current sub-question before fetching, extracts only relevant content
- [ ] Self-reflection prompt pattern after each iteration (unanswered questions, contradictions, confidence, stop criteria)
- [ ] Planning phase produces report outline as research anchor + optional dependency graph between directions
- [ ] playwright-cli is primary search method (priority 1); other methods demoted to fallbacks
- [ ] Loop termination: mix of hard limit (max iterations per direction) + soft signal (gap analysis says "sufficient")
- [ ] Citation provenance: every fact traceable to source URL from extraction through synthesis
- [ ] Worker sub-agent files (3 IDE variants) updated to match new iterative workflow
- [ ] `assets/report_template.md` updated if needed (backward-compatible)
- [ ] Context management strategy documented (selective extraction + scratchpad size limits)
- [ ] Benchmarks created/updated for deep-research skill
- [ ] `deno task check` passes

## Solution

[Awaiting variant selection]
