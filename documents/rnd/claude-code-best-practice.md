# Claude Code Best Practice — Patterns for flowai

**Source**: [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) (commit `defaf33`, synced with Claude Code v2.1.97, Apr 2026)
**Author**: Shayan Raisshan, with input from Boris Cherny (Claude Code creator) and the Anthropic team
**Scope**: reference implementation + 13 concept guides + 15 reports + 69 curated tips + 4 working examples (skills/agents/commands/hooks)
**Why this matters for flowai**: this is the closest thing to an "official" pattern book for Claude Code primitives. It documents fields, hooks events, settings hierarchy, and orchestration patterns that we must match or exceed for cross-IDE parity (SRS FR-HOOK-DOCS-FR-IDE-SCOPE).

---

## 1. Repository structure

- [`.claude/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/.claude) — live config (5 agents, 8 commands, 10+ skills, settings.json, hooks/scripts)
- [`.codex/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/.codex) — mirror config for Codex IDE
- [`best-practice/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/best-practice) — 13 concept guides incl. [`claude-settings.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-settings.md) (62 KB, most authoritative)
- [`reports/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/reports) — 15 analytical reports
- [`tips/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/tips) — 69 short tips by Anthropic team (Boris Cherny, Thariq, Clara Code team)
- [`orchestration-workflow/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/orchestration-workflow) — end-to-end Command→Agent→Skill example (weather)
- [`agent-teams/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/agent-teams) — parallel dev pattern with tmux + worktrees
- [`implementation/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/implementation) — 8 implementation walkthroughs
- [`CLAUDE.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md) — 7.5 KB, reference CLAUDE.md for the repo itself

---

## 2. The Command → Agent → Skill architecture

**Central pattern**. Reference: [`orchestration-workflow/orchestration-workflow.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/orchestration-workflow/orchestration-workflow.md), report [`reports/claude-agent-command-skill.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-agent-command-skill.md).

```
User → /command (entry, orchestration)
        ↓ Agent tool
     Agent (isolated context, autonomous)
        ├── preloaded skill (inline knowledge via `skills:` field)
        ↓ returns structured data
     Skill (inline, reusable rendering/output)
        ↓
     Output
```

Working example (`weather`):
- Command [`/weather-orchestrator`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/commands/weather-orchestrator.md): `model: haiku`, asks user C/F, calls `weather-agent`, then calls `weather-svg-creator` skill
- Agent [`weather-agent`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/agents/weather-agent.md): `model: sonnet`, preloads `weather-fetcher` skill, returns `{temp, unit}`
- Skill [`weather-fetcher`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/skills/weather-fetcher) (agent-embedded, `user-invocable: false`): instructions to call Open-Meteo
- Skill [`weather-svg-creator`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/skills/weather-svg-creator): reads temp from caller context (no re-fetch), writes SVG + markdown output

Why three layers (not one):
- **Separation**: fetch (agent) ⊥ render (skill) — each reusable
- **Context economy**: command stays lightweight; only agent incurs a second context window
- **Reusability**: `weather-svg-creator` callable from any command/agent
- **Resolution order** on auto-invocation (from `reports/claude-agent-command-skill.md`):
  1. Skill (inline, cheapest)
  2. Agent (separate context)
  3. Command (never auto — user-triggered only)

**Anti-pattern** (from [`CLAUDE.md:50`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md)):

> Subagents **cannot** invoke other subagents via bash commands. Use the Agent tool (renamed from Task in v2.1.63; `Task(...)` still works as an alias): `Agent(subagent_type="agent-name", description="...", prompt="...", model="haiku")`. Be explicit about tool usage in subagent definitions. Avoid vague terms like "launch" that could be misinterpreted as bash commands.

**Implication for flowai**: our command/agent/skill split already matches this shape, but we should (a) document the three-layer pattern as a first-class architectural idiom in `design.md`, (b) ensure the `Task`/`Agent` tool usage note is in our IDE differences doc, and (c) add an `orchestration-workflow/` analogue to our framework packs as a working reference.

---

## 3. Frontmatter specifications

### 3.1 Subagents — 16 fields

Source: [`best-practice/claude-subagents.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-subagents.md).

- `name` (string, required) — lowercase + hyphens identifier
- `description` (string, required) — when to invoke; use `"PROACTIVELY"` for auto-invoke
- `tools` (string/list) — allowlist; supports `Agent(agent_type)` to restrict spawnable subagents. Old alias `Task(agent_type)` still works. Inherits all if omitted
- `disallowedTools` (string/list) — blocklist subtracted from inherited/allowed list
- `model` (string) — `sonnet`, `opus`, `haiku`, full ID, or `inherit` (default)
- `permissionMode` (string) — `default` | `acceptEdits` | `auto` | `dontAsk` | `bypassPermissions` | `plan`
- `maxTurns` (int) — cap before forced stop
- `skills` (list) — skill names **preloaded into system prompt** (full content injected, not lazily available)
- `mcpServers` (list) — per-agent MCP config (strings or inline `{name, config}` objects)
- `hooks` (object) — per-agent lifecycle hooks (any hooks event)
- `memory` (string) — persistent scope: `user` | `project` | `local`
- `background` (bool) — run as background task when invoked
- `effort` (string) — `low` | `medium` | `high` | `max` (Opus 4.6 only)
- `isolation` (string) — `"worktree"` creates temp git worktree, auto-cleaned if no changes
- `initialPrompt` (string) — prepended to user prompt when agent is started as main session via `--agent`
- `color` (string) — `red|blue|green|yellow|purple|orange|pink|cyan`

Example (`weather-agent.md`, full frontmatter):

```yaml
---
name: weather-agent
description: Use this agent PROACTIVELY when you need to fetch weather data for Dubai, UAE. This agent fetches real-time temperature from Open-Meteo using its preloaded weather-fetcher skill.
allowedTools: ["Bash(*)", "Read", "Write", "Edit", "WebFetch(*)", "Agent", "mcp__*"]
model: sonnet
color: green
maxTurns: 5
permissionMode: acceptEdits
memory: project
skills:
  - weather-fetcher
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: python3 ${CLAUDE_PROJECT_DIR}/.claude/hooks/scripts/hooks.py --agent=voice-hook-agent
          timeout: 5000
          async: true
---
```

### 3.2 Skills — 13 fields

Source: [`best-practice/claude-skills.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-skills.md).

- `name` (string) — slug; defaults to dir name. Used as `/slash-command` id
- `description` (string, **recommended**) — **trigger, not summary**. Model scans at session start to decide auto-invocation
- `argument-hint` (string) — autocomplete hint (e.g. `[issue-number]`)
- `disable-model-invocation` (bool) — `true` blocks model auto-invoke; user only
- `user-invocable` (bool) — `false` hides from `/` menu; becomes background knowledge for agent preloading
- `allowed-tools` (string) — tools usable without permission prompt while skill active (e.g. `Bash(agent-browser:*)`)
- `model` (string) — per-skill model override
- `effort` (string) — per-skill effort override
- `context` (string) — `"fork"` runs skill in isolated subagent; main context sees only the final result
- `agent` (string) — subagent type when `context: fork`; default `general-purpose`
- `hooks` (object) — lifecycle hooks bound to skill, active for session duration after invocation (on-demand hooks)
- `paths` (string/list) — glob patterns; skill auto-activates only when matching files in scope
- `shell` (string) — `bash` (default) or `powershell` for `` !`command` `` blocks

### 3.3 Commands — 13 fields

Source: [`best-practice/claude-commands.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-commands.md).

Same field set as skills (`name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `paths`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `shell`, `hooks`), but semantically:
- Commands are **never auto-invoked** — `/` entry only (even without `disable-model-invocation`).
- Orchestrators for Agent+Skill combinations.

**Implication for flowai**: our current pack schema should expose this exact superset. Missing fields to consider adding (cross-IDE parity permitting): `context: fork`, `agent`, `paths` (glob-based auto-activation), `user-invocable`, `disable-model-invocation`, `initialPrompt`. `isolation: worktree` is a Claude-only feature — document under IDE differences.

---

## 4. The `description` field as a trigger

Source: [`tips/claude-thariq-tips-17-mar-26.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-thariq-tips-17-mar-26.md).

> When Claude Code starts a session, it builds a listing of every available skill with its description. This listing is what Claude scans to decide "is there a skill for this request?" Which means the description field is not a summary — it's a description of **when to trigger** this skill. Write it for the model.

Good example (`agent-browser/SKILL.md`):

```
Browser automation CLI for AI agents. Use when the user needs to interact with
websites, including navigating pages, filling forms, clicking buttons, taking
screenshots, extracting data, testing web apps, or automating any browser task.
Triggers include requests to "open a website", "fill out a form", "click a
button", "take a screenshot", "scrape data from a page", ...
```

**Pattern**: explicit trigger phrases + user verbs. Not "what the skill does" but "when to call it".

**Implication for flowai**: audit all our skill descriptions — most are summaries. Rewrite as trigger lists. Add a lint rule in `deno task check` that flags descriptions containing words like "this skill provides" or missing verbs like "use when".

---

## 5. Skill anti-patterns

Source: [`tips/claude-thariq-tips-17-mar-26.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-thariq-tips-17-mar-26.md) and the repo README.

- **Stating the obvious**: Claude already knows standard best practices. Skills should push Claude *out* of its default behavior (e.g. "avoid Inter font, purple gradients, default Material Design colors") not restate them.
- **Railroading**: rigid step-by-step scripts reduce adaptability. Prefer goal + constraints over numbered instructions.
- **Missing `Gotchas` section**: highest-signal content in any skill. Should accumulate real failure points over time.
- **Single-file skills**: a skill is a folder, not a markdown file. Use progressive disclosure via sibling files (`reference.md`, `examples/`, `gotchas.md`, `scripts/`). Claude reads them on demand.
- **Description as summary** (see §4).
- **Missing config/state**: for stateful skills, store setup in `config.json` alongside SKILL.md; use `${CLAUDE_PLUGIN_DATA}` for persistent data to survive skill upgrades.

**Implication for flowai**: we already prefer folder-based skills; add `Gotchas` as a required section in `flowai-skill-engineer-skill` template. Benchmark scenarios should check for `Gotchas` presence.

---

## 6. Context forking (`context: fork`)

Source: README + [`best-practice/claude-skills.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-skills.md).

> use `context: fork` to run a skill in an isolated subagent — main context only sees the final result, not intermediate tool calls. The `agent` field lets you set the subagent type

| Aspect          | Normal skill               | `context: fork` skill                |
| --------------- | -------------------------- | ------------------------------------ |
| Context         | inline in current          | isolated subagent, fresh window      |
| Tool visibility | main sees all tool calls   | main sees only final result         |
| Tool access     | inherits from session      | uses subagent's tool config          |
| Use case        | lightweight transformation | browser automation, multi-step fetch |

**Use cases**: browser-automation skills (avoids DOM-snapshot pollution), heavy refactor skills, long-running analysis. Lets a skill author opt into isolation without introducing an explicit subagent.

**Implication for flowai**: this is orthogonal to `disable-model-invocation`. Our framework has no `context: fork` analogue — we rely on `Agent(Explore)` subagent spawning. Consider adding a `context` field to our skill schema, with IDE-specific fallback: Claude Code → native fork; Cursor/OpenCode → lint-warning + fallback to explicit subagent call.

---

## 7. Hooks system — 27 events

Source: [`.claude/hooks/HOOKS-README.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/hooks/HOOKS-README.md).

Previous flowai docs mention 13 events — this is outdated. Claude Code v2.1.97 exposes **27 hook events**. Full list:

- **Tool lifecycle**: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`
- **Session**: `SessionStart`, `SessionEnd`, `StopFailure`, `Stop`, `UserPromptSubmit`, `Notification`
- **Subagent**: `SubagentStart`, `SubagentStop`
- **Compact**: `PreCompact`, `PostCompact`
- **Setup**: `Setup`, `ConfigChange`, `InstructionsLoaded`
- **Worktree**: `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`
- **MCP elicitation**: `Elicitation`, `ElicitationResult`
- **Teammates (experimental)**: `TeammateIdle`, `TaskCreated`, `TaskCompleted`

Common options on every hook: `async: true`, `timeout: <ms>`, `once: true` (applicable to `SessionStart`, `SessionEnd`, `PreCompact`), `matcher` (required for `FileChanged`, optional for `PreToolUse`/`PostToolUse`).

Config shape (from [`.claude/settings.json`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/settings.json)):

```json
{
  "hooks": {
    "PreToolUse": [{
      "hooks": [{
        "type": "command",
        "command": "python3 ${CLAUDE_PROJECT_DIR}/.claude/hooks/scripts/hooks.py",
        "timeout": 5000,
        "async": true,
        "statusMessage": "PreToolUse"
      }]
    }],
    "FileChanged": [{
      "matcher": ".envrc|.env|.env.local",
      "hooks": [{ "type": "command", "command": "python3 .claude/hooks/scripts/hooks.py" }]
    }]
  }
}
```

Reference implementation [`.claude/hooks/scripts/hooks.py`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/hooks/scripts/hooks.py) (18 KB):

- Cross-platform audio dispatch (`afplay` / `paplay` / `winsound`)
- Per-hook and per-agent sound maps (`HOOK_SOUND_MAP`, `AGENT_HOOK_SOUND_MAP`)
- `BASH_PATTERNS` with regex matching for special sounds (e.g. `git commit` → different tone)
- `--agent=<name>` flag for agent-specific voices

**On-demand skill hooks** (`tips/claude-thariq-tips-17-mar-26.md`): hooks declared inside a skill's frontmatter activate only while that skill is in scope and last for the session.

> Examples: `/careful` — blocks `rm -rf`, `DROP TABLE`, force-push, `kubectl delete`. `/freeze` — blocks any Edit/Write outside a specific directory.

**Implications for flowai**:
- Update `documents/ides-difference.md` hook matrix — current count of 13 is stale.
- Our cross-IDE hook abstraction must at minimum support: tool lifecycle, session, subagent, prompt, file-change (via `matcher`). Others are nice-to-have.
- Document `once: true`, `async: true`, `matcher`, `timeout` as the standard hook config primitives.
- Add on-demand hooks pattern (hooks embedded in skill frontmatter) as an advanced capability. Currently our skills cannot carry hooks.

---

## 8. Settings hierarchy — 5 levels

Source: [`best-practice/claude-settings.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-settings.md).

Priority (highest → lowest):

1. **Managed settings** — MDM/Registry/server-pushed; cannot be overridden. Paths:
   - macOS: `/Library/Application Support/ClaudeCode/`
   - Linux/WSL: `/etc/claude-code/`
   - Windows: `C:\Program Files\ClaudeCode\`
2. **CLI args** — `--model`, `--permission-mode`, etc. (session override)
3. **`.claude/settings.local.json`** — personal, gitignored
4. **`.claude/settings.json`** — team-shared, committed
5. **`~/.claude/settings.json`** — global personal defaults

Merging rules:
- Scalars (strings, bools, numbers) — **higher level replaces**
- Arrays (`permissions.allow`, `permissions.ask`) — **concatenated + deduped** across all levels
- Objects (`sandbox`, `hooks`, `statusLine`) — **deep merge**
- `permissions.deny` has **highest safety precedence** — cannot be overridden by a lower-level `allow`

Key sections of `settings.json`:
- `permissions.{allow,ask,deny,defaultMode,additionalDirectories}`
- `hooks`, `disableAllHooks`
- `mcpServers`, `enableAllProjectMcpServers`, `enabledMcpjsonServers`, `disabledMcpjsonServers`
- `model`, `effortLevel`, `availableModels`, `modelOverrides` (Bedrock/Vertex ARNs)
- `statusLine`, `spinnerTipsEnabled`, `spinnerTipsOverride`, `spinnerVerbs`
- `outputStyle`, `plansDirectory`, `autoMemoryDirectory`
- `sandbox.{enabled, autoAllowBashIfSandboxed, excludedCommands, filesystem.{allowWrite,denyRead}}`
- `worktree.{symlinkDirectories, sparsePaths}` — for large monorepos
- `attribution.{commit, pr}`
- `env` — session environment variables

Permission syntax:
- `Bash(pattern)` with `*` wildcards (e.g. `Bash(git *)`, `Bash(npm run *)`)
- `Read(path)`, `Edit(path)`, `Write(path)` with gitignore-style prefixes: `//` absolute, `~/` home, `/` project root, `./` relative
- `WebFetch(domain:*.example.com)` for domain allow-listing
- `mcp__*` for all MCP tools
- `Agent(name)` to control subagent spawning

Example `ask` set from the reference repo [`.claude/settings.json`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/settings.json): `Bash(rm *)`, `Bash(rmdir *)`, `Bash(docker *)`, `Bash(npm *)`, `Bash(git push *)`, `Bash(kill *)`.

Permission modes: `default`, `acceptEdits`, `plan`, `auto` (ML classifier, Team/Enterprise), `bypassPermissions` (dangerous), `dontAsk`.

**Implication for flowai**: document the 5-level hierarchy in [`documents/ides-difference.md`](documents/ides-difference.md) as the Claude Code baseline. The concatenate-and-dedupe rule for arrays is a design detail we should replicate in any flowai config merging. Deny-always-wins is a security invariant worth copying.

---

## 9. Memory (`CLAUDE.md` hierarchy)

Source: [`best-practice/claude-memory.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-memory.md).

- **Ancestor loading (eager)**: `cd /repo/frontend && claude` loads `/repo/CLAUDE.md` + `/repo/frontend/CLAUDE.md`. Siblings (`/repo/backend/CLAUDE.md`) are NOT loaded.
- **Descendant loading (lazy)**: `/repo/backend/CLAUDE.md` loaded only when Claude reads a file in `backend/`.
- **~~200-line rule~~** (folk claim from upstream): keep each CLAUDE.md < 200 lines. **Tested empirically — see [claude-md-length-empirical.md](claude-md-length-empirical.md)**. Short version for Haiku 4.5: root single-file threshold is ~1000 tokens (matches 200 lines), tree-sum threshold is ~6000 total tokens (~6× more budget by splitting across lazy-loaded descendants). Rule type dominates file size — a surface marker holds at 100% up to 24k tokens; a behavioral language override can drop below 80% even at 500 tokens. The folk rule has a grain of truth for a single eager-loaded file under a small model, but is not a universal invariant. Follow-ups (Sonnet/Opus, position sweep, descendant-loading query) listed in the study doc.
- **`.claude/rules/` pattern**: move specialized rule sets into `.claude/rules/<topic>.md`, then delegate to a specialized agent. Example from repo: `.claude/rules/presentation.md` → `presentation-curator` agent.
- **`@path imports`**: referenced as a convention in CLAUDE.md to link between files (not a framework feature — a prompting idiom).

**Implication for flowai**: the «one number for max length» framing is a misconception. The honest threshold depends on the strictest rule, the model, and the layout. The empirical result supports keeping the **root** memory file small and pushing detail into descendant `documents/AGENTS.md`/`scripts/AGENTS.md` — which the existing flowai scaffold already does. The `.claude/rules/` idea aligns with this — a rules subagent loads its memory only when invoked. A `check-claude-md-length.ts` gate should warn on the **root** file specifically and allow descendants to be larger.

---

## 10. Parallel agent teams (tmux + worktrees)

Source: [`agent-teams/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/agent-teams), [`implementation/claude-agent-teams-implementation.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/implementation/claude-agent-teams-implementation.md).

Key distinction:

> Agent Teams spawn **multiple independent Claude Code sessions** that coordinate via a shared task list. Unlike subagents (isolated context forks within one session), each teammate gets its own full context window with CLAUDE.md, MCP servers, and skills loaded automatically.

Setup:
1. Create N git worktrees (one per teammate)
2. Open tmux with N panes, one Claude session per pane
3. All panes share one task list as the coordination bus
4. Each teammate has a specialization (e.g. Command Architect / Agent Engineer / Skill Designer)
5. Kickoff: agree on the data contract *before* starting parallel work

Reference task list from `agent-teams-prompt.md`:

```
Shared Task List:
├─ [in_progress] Agree data contract: {time, timezone, formatted}
├─ [pending]     Command Architect: implement orchestrator
├─ [pending]     Agent Engineer:    fetch Dubai time via Bash
├─ [pending]     Skill Designer:    SVG rendering
└─ [completed]   All three agree on interface
```

When to use: 3+ independent components, human-in-the-loop coordination, when context isolation per teammate outweighs coordination cost.

When NOT to use: small single-feature changes, tight coupling between components, solo dev.

Pitfall: skipping the data-contract step. "Better 5 minutes on a task list than 30 minutes of debugging misaligned interfaces."

**Implication for flowai**: we don't need to ship tmux scripts, but we should document this pattern as an advanced workflow in a skill (e.g. `flowai-skill-parallel-worktree-development`). The data-contract-first rule maps directly to our Planning Rules in CLAUDE.md (`Variant Analysis`, `Plan Persistence`).

---

## 11. Built-in catalogs (reference)

### Official subagents (5)

Source: [`best-practice/claude-subagents.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-subagents.md).

- `general-purpose` — inherit, all tools. Default for autonomous multi-step work
- `Explore` — haiku, read-only. Fast codebase search
- `Plan` — inherit, read-only. Pre-planning in plan mode
- `statusline-setup` — sonnet, Read+Edit only. Status line config
- `claude-code-guide` — haiku, Glob/Grep/Read/WebFetch/WebSearch. Claude Code Q&A

### Official skills (5)

Source: [`best-practice/claude-skills.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-skills.md).

- `simplify` — review changed code for reuse/quality/efficiency, refactor duplication
- `batch` — bulk commands across many files
- `debug` — debug failing commands or code
- `loop` — run a prompt/command on recurring interval (up to 3 days)
- `claude-api` — build apps with Claude API/Anthropic SDK; auto-triggered on `anthropic`/`@anthropic-ai/sdk` imports

### Built-in slash commands — 68 total in 11 categories

Source: [`best-practice/claude-commands.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-commands.md).

- Auth (3): `/login`, `/logout`, `/setup-bedrock`
- Config (13): `/color`, `/config`, `/keybindings`, `/permissions`, `/privacy-settings`, `/sandbox`, `/statusline`, `/stickers`, `/terminal-setup`, `/theme`, `/voice`, ...
- Context (7): `/context`, `/cost`, `/extra-usage`, `/insights`, `/stats`, `/status`, `/usage`
- Debug (7): `/doctor`, `/feedback`, `/help`, `/powerup`, `/release-notes`, `/tasks`, ...
- Export (2): `/copy`, `/export`
- Extensions (8): `/agents`, `/chrome`, `/hooks`, `/ide`, `/mcp`, `/plugin`, `/reload-plugins`, `/skills`
- Memory (1): `/memory`
- Model (6): `/effort`, `/fast`, `/model`, `/passes`, `/plan`, `/ultraplan`
- Project (5): `/add-dir`, `/diff`, `/init`, `/review`, `/security-review`
- Remote (8): `/autofix-pr`, `/desktop`, `/install-github-app`, `/install-slack-app`, `/mobile`, `/remote-control`, `/remote-env`, `/schedule`, `/teleport`, `/web-setup`
- Session (7): `/branch`, `/btw`, `/clear`, `/compact`, `/exit`, `/rename`, `/resume`, `/rewind`

**Implication for flowai**: our `flowai-*` commands overlap with some of these (`/flowai-commit` vs built-in git flow). Avoid naming collisions; prefix everything with `flowai-` to stay out of Anthropic's namespace.

---

## 12. Advanced tool-use techniques

Source: [`reports/claude-advanced-tool-use.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-advanced-tool-use.md).

- **Programmatic Tool Calling (PTC)** — Claude writes Python that calls tools in a sandbox, collapsing N round trips into 1. ~37% token reduction. Claude Opus/Sonnet 4.6 only, Agent SDK (API level), not exposed in CLI.
- **Dynamic Filtering** — Claude writes Python to filter web-search/fetch results before they enter context. ~24% fewer input tokens, +13pp accuracy on BrowseComp benchmark.
- **Tool Search Tool** — 50 MCP tools × 1.5K tokens = 75K tokens *before the first user message*. `defer_loading: true` + on-demand tool discovery reduces tool-definition tokens ~85%. Best practice: keep 3–5 frequently used tools loaded, defer the rest. Claude Code exposes this via MCPSearch auto-mode (v2.1.7+).
- **Tool Use Examples** — JSON schema alone leaves ambiguity on complex params (~72% accuracy). Adding `input_examples` (1–5, showing variety: minimal/partial/full) raises accuracy to ~90%.

**Implication for flowai**: PTC and Dynamic Filtering are API-level — we can't use them from skills. Tool Search and Tool Use Examples are directly actionable: (a) flag MCP configs with >20 tools in a `deno task check` lint; (b) add an `examples:` convention to skill frontmatter for tool parameter illustrations.

---

## 13. LLM day-to-day variance (reality check)

Source: [`reports/llm-day-to-day-degradation.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/llm-day-to-day-degradation.md).

Model weights are frozen. Behavior is not. Nine layers sit above the weights, each of which can shift output ±8–14%:

1. Session context (your accumulated errors, context pollution)
2. System prompt (hot-fixed server-side)
3. Post-training (RLHF updates without weight changes)
4. Sampling parameters (server-tuned)
5. Speculative decoding (draft model quality varies)
6. MoE routing / batch composition — ±8–14% **measured**
7. Hardware routing (TPU vs GPU vs Trainium)
8. Quantization (FP16 vs INT8)
9. Compiler & runtime (XLA bugs, proven real)

Infrastructure bugs confirmed in Anthropic's September 2025 postmortem:

- **Context Window Routing bug** — Sonnet 4 requests leaked to 1M-token servers; affected 16% of requests at peak
- **TPU Output Corruption** — Thai/Chinese characters mid-English output (Opus 4.1, Sonnet 4)
- **XLA:TPU compiler bug** — wrong top-k for certain batches (Haiku 3.5 + subset of Sonnet/Opus)

Anthropic statement:

> We never reduce model quality due to demand, time of day, or server load. The problems our users reported were due to infrastructure bugs alone.

MoE routing variance measured across providers (Scale AI):

- OpenAI (GPT-4): ±10–12%
- Anthropic (Claude): ±8–11%
- Google (Gemini): ±9–14%

> Example: same model, 77% jailbreak resistance → 63% next day. 14pp swing from batch composition alone.

A/B testing cannot detect a 5% signal under ±10–15% noise. No `seed` parameter exists on the Messages API. Even `temperature=0.0` is not deterministic ([claude-code#3370](https://github.com/anthropics/claude-code/issues/3370)).

Mitigations:
- Use `/compact` or a fresh session when quality drops (context pollution)
- Pin model snapshots instead of floating aliases
- Run a daily canary suite on a fixed benchmark
- Keep a fallback provider/model path for incident windows
- Don't rely on bit-perfect reproducibility

**Implications for flowai**:
- Our benchmark framework must record model snapshot + run timestamp, and tolerate ±10% variance per scenario. Pass/fail on a single run is misleading.
- Add a trend report across N runs (moving average) rather than one-shot scoring — echoes the [HyperAgents](documents/rnd/hyperagents-practical-conclusions.md) finding.
- Document in `AGENTS.md` that skill/agent benchmarks have inherent noise floor.

---

## 14. Claude CLI vs Agent SDK — determinism gap

Source: [`reports/claude-agent-sdk-vs-cli-system-prompts.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-agent-sdk-vs-cli-system-prompts.md).

- **CLI (Claude Code)**: modular system prompt (~269 base strings + conditional), 18+ built-in tool instructions, coding guidelines, full safety rules, auto-loads CLAUDE.md.
- **SDK (default)**: minimal system prompt, only provided tools, no coding guidelines, no CLAUDE.md loading.
- **SDK with `claude_code` preset**: matches CLI modular prompt, but CLAUDE.md still requires explicit `settingSources: ["project"]`.

Determinism: **none of these guarantee reproducible output**, even at `temperature=0.0`. Causes: different system prompts, floating-point variance, MoE routing, batching differences, snapshot updates.

**Implication for flowai**: when authoring commands that need to run headless (e.g. via `claude --print --output-format json`), assume CLI and SDK paths will behave differently. If a skill/command is meant to run in both interactive and headless contexts, benchmark both.

---

## 15. MCP, Power-ups, and CLI flags (quick hits)

### MCP ([`best-practice/claude-mcp.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-mcp.md))

- 4 servers author actually uses daily: **Context7** (fresh docs, anti-hallucination), **Playwright** (browser automation), **Claude in Chrome** (real-browser debugging — console/network/DOM), **DeepWiki** (structured repo docs).
- Lesson: "People think 15 MCP servers = better. In practice, you use 4."
- Config: `.mcp.json` (project) or `~/.claude.json` (user). Two server types: `stdio` (local process) and `http` (remote).
- Permission naming: `mcp__<server>__<tool>` for granular allow/deny.

### Power-ups ([`best-practice/claude-power-ups.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-power-ups.md))

`/powerup` opens 10 interactive lessons for features users typically miss: codebase talk (`@files`), mode steering (shift+tab, plan mode), undo (`/rewind`, Esc-Esc), background tasks, CLAUDE.md rules, MCP, skills+hooks automation, subagents, remote control, model dialing.

### CLI startup flags ([`best-practice/claude-cli-startup-flags.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-cli-startup-flags.md))

70+ flags. The ones worth knowing for automation:
- Session: `--continue`/`-c`, `--resume`/`-r`, `--fork-session`, `--worktree`/`-w`
- Model: `--model`, `--betas`
- Permissions: `--permission-mode` (`plan`, `acceptEdits`, `bypassPermissions`), `--allowedTools`
- System prompt: `--system-prompt` (replace), `--append-system-prompt` (extend)
- MCP: `--mcp-config`, `--strict-mcp-config`
- Debug: `--debug <categories>` (api, hooks, etc.)
- Headless: `--print`/`-p`, `--output-format json`, `--max-turns`, `--max-budget-usd`, `--json-schema` for structured output validation

---

## 16. Workflow best practices (condensed from CLAUDE.md and tips)

From [`CLAUDE.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md) and the Anthropic `tips/` set:

- Use commands for workflows instead of standalone agents
- Create **feature-specific** subagents with preloaded skills (progressive disclosure) rather than general-purpose agents
- Manual `/compact` at ~50% context usage
- Start complex tasks in **plan mode**
- Human-gated task list workflow for multi-step tasks
- Break subtasks small enough to finish under 50% context budget
- One commit per file (no bundling)
- Keep root CLAUDE.md/AGENTS.md small (≤1000 tokens for Haiku-class models). Push detail into descendant `documents/`/`scripts/` memory files (lazy-loaded). See §9 for empirical data.
- Write skill descriptions as **triggers, not summaries**
- Capture gotchas over time in a dedicated skill section
- Prefer goal + constraints over railroaded step-by-step instructions
- Use `${CLAUDE_PLUGIN_DATA}` for persistent per-skill state

---

## 17. Direct recommendations for flowai

Prioritized, each tied to a concrete artifact change:

1. **Update hook event count to 27** in [`documents/ides-difference.md`](documents/ides-difference.md). Our current 13-event list is stale (v2.0 era).
2. **Add `description`-as-trigger lint** to `deno task check` — flag skill descriptions that read like summaries (heuristic: missing "use when", "trigger on"; starts with "this skill"/"provides"/"helps").
3. **Add `Gotchas` section requirement** to `flowai-skill-engineer-skill` template and to a new benchmark scenario that asserts presence.
4. **Introduce `context: fork` in the skill schema** with IDE fallback semantics (Claude Code: native; Cursor/OpenCode: warn + explicit subagent call). Document under IDE differences.
5. **Document the Command → Agent → Skill idiom** as a first-class pattern in [`documents/design.md`](documents/design.md). Ship a working reference pack (analogue of `orchestration-workflow/`).
6. **Add `initialPrompt`, `paths`, `user-invocable`, `disable-model-invocation`** to our agent/skill frontmatter. These are present in Claude Code but absent in our schema.
7. **Root CLAUDE.md size check** in `deno task check` (`check-claude-md-length.ts`) — warn when **root** AGENTS.md/CLAUDE.md exceeds ~1000 tokens; allow descendants to be larger. Threshold derived from the empirical study ([`claude-md-length-empirical.md`](claude-md-length-empirical.md)), not from a hard-coded line count. The «200 lines» folk rule turned out to have a grain of truth but over-simplifies; see the study for caveats and model-specificity.
8. **Record model snapshot + ±10% variance tolerance** in the benchmark runner. Add moving-average trend reporting (see also [`hyperagents-practical-conclusions.md`](documents/rnd/hyperagents-practical-conclusions.md) §2).
9. **Permission merge rules** — when flowai generates merged settings across IDE targets, follow Claude Code's array-concat + scalar-replace + deny-wins rules for the Claude Code output path.
10. **On-demand hooks** (hooks in skill frontmatter, active only while skill is in scope) — add to the framework as an advanced capability. Use cases: `/careful` blocks destructive commands, `/freeze` restricts edits to a directory.
11. **Tool-use examples** — add `examples:` convention for skill parameter illustrations (1–5 per skill, mix minimal/partial/full).
12. **Naming discipline**: never collide with Claude Code's 68 built-in slash commands; always prefix `flowai-`.

---

## 18. Files worth reading in full

Highest value, in order:

1. [`best-practice/claude-subagents.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-subagents.md) — canonical agent spec
2. [`best-practice/claude-skills.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-skills.md) — canonical skill spec
3. [`best-practice/claude-settings.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/best-practice/claude-settings.md) — 62 KB, the full settings reference
4. [`reports/claude-agent-command-skill.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-agent-command-skill.md) — when to use which primitive
5. [`.claude/hooks/HOOKS-README.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/.claude/hooks/HOOKS-README.md) — 27-event hook catalog
6. [`orchestration-workflow/`](https://github.com/shanraisshan/claude-code-best-practice/tree/main/orchestration-workflow) — complete Command→Agent→Skill working example
7. [`reports/llm-day-to-day-degradation.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/llm-day-to-day-degradation.md) — realistic expectations for benchmarking
8. [`reports/claude-advanced-tool-use.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-advanced-tool-use.md) — PTC, Tool Search, input_examples
9. [`tips/claude-thariq-tips-17-mar-26.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-thariq-tips-17-mar-26.md) — skill anti-patterns and on-demand hooks
10. [`CLAUDE.md`](https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md) — model CLAUDE.md for a Claude Code project
