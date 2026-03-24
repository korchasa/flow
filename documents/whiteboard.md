# Packs: модульная установка framework-ресурсов

## Goal

Дать пользователю управляемый выбор, какие группы ресурсов устанавливать. Не захламлять проект ненужными skills/agents/hooks. Подготовить инфраструктуру для pipeline-автоматизации из auto-flow2.

## Overview

### Context

- flow: 38 skills + 4 agents, ставятся все или фильтруются поштучно (include/exclude)
- auto-flow2: SDLC pipeline на Claude Code (agents + hooks + scripts + HITL + resume + reflection memory)
- Решение: **packs**. Source of truth — `pack.yaml`. При установке flowai генерирует IDE-специфичные артефакты
- Каждый pack = Claude Code plugin (plugin.json генерируется из pack.yaml)
- Pack `flow` — базовый, ставится всегда. Остальные — opt-in

### Naming и Namespacing

Имена skills и agents — **чистые**, без vendor prefix. Namespace = pack name. Разделитель — дело IDE-адаптера.

**В pack.yaml и SKILL.md:**
- Pack: `name: flow`, `name: flow-content`
- Skill: `name: plan`, `name: write-dep`

**IDE-адаптеры подставляют разделитель при генерации:**
- Claude Code: `/flow:plan`, `/flow-content:write-dep` (двоеточие — native plugin syntax)
- Cursor: формат зависит от их plugin системы (TBD)
- OpenCode: формат зависит от их plugin системы (TBD)
- Fallback (flat раскладка): `/plan`, `/write-dep` — без namespace

Авторы skills не думают о разделителях — это ответственность flowai.

Старые имена → новые:
- `flow-plan` → `plan` (pack `flow`)
- `flow-skill-write-dep` → `write-dep` (pack `flow-content`)
- `flow-skill-deno-deploy` → `deno-deploy` (pack `flow-deno-application`)
- `flow-skill-engineer-skill` → `engineer-skill` (pack `flow-ide-extend`)
- `sdlc-pipeline` → `sdlc-pipeline` (pack `flow-pipelines`)

### Claude Code Plugin Structure (target output, генерируется)

```
<plugin-dir>/
├── .claude-plugin/
│   └── plugin.json        # ГЕНЕРИРУЕТСЯ из pack.yaml
├── skills/
├── agents/
├── hooks/
│   ├── hooks.json         # ГЕНЕРИРУЕТСЯ из pack.yaml hooks секции
│   └── *.sh
└── settings.json          # ГЕНЕРИРУЕТСЯ если нужен
```

### Зависимости между skills (анализ кода)

**flow внутренние** (замкнуты):
- commit → init, reflect
- review-and-commit → commit, review, reflect
- review → maintenance
- spec → plan
- update → init

**flow → наружу** (делегация — graceful skip):
- init → configure-deno-commands, setup-ai-ide-devcontainer (в flow)
- init → deno-deploy, code-style-ts-deno (в flow-deno-application — skip если не установлен)
- update → аналогично

**внутри packs** (замкнуты):
- interactive-teaching-materials → draw-mermaid-diagrams (flow-content)
- write-prd → conduct-qa-session (flow-content)
- deno-cli → deno-deploy (flow-deno-application)

**Межпаковых зависимостей нет** (design invariant). write-gods-tasks в flow (базовый формат).

### Constraints

- Обратная совместимость: v1 `.flowai.yaml` без packs = всё ставится
- Кросс-IDE: Claude Code (plugin generation), Cursor, OpenCode (раскладка)
- Pack `flow` ставится всегда (implicit)
- Packs плоские, без зависимостей между собой
- Межпаковых зависимостей skills нет (design invariant, CI проверка)
- Source of truth — `pack.yaml`. plugin.json, hooks.json генерируются
- Clean sync: удаление старых `flow-*` ресурсов при миграции

## Definition of Done

- [ ] pack.yaml — единственный source of truth
- [ ] flowai генерирует plugin.json, hooks.json из pack.yaml
- [ ] Skills переименованы: убран префикс `flow-` / `flow-skill-`
- [ ] Все ресурсы в `framework/packs/`
- [ ] Pack `flow` ставится всегда (implicit)
- [ ] `.flowai.yaml` v2 с `packs:` (opt-in packs)
- [ ] flowai: Claude Code → генерация plugin dirs; Cursor/OpenCode → раскладка
- [ ] Reflection: настраиваемая опция, agent templates
- [ ] Pipeline infrastructure как pack
- [ ] flow-init/flow-update: graceful skip
- [ ] flowai list-packs
- [ ] Clean sync: миграция старых `flow-*` ресурсов
- [ ] CI: проверка замкнутости зависимостей
- [ ] Тесты + benchmarks

## Solution

### pack.yaml (source of truth)

```yaml
name: flow
version: "2.0.0"
description: "Everyday development workflow — planning, coding, review, init, debugging"
author: korchasa
repository: "https://github.com/korchasa/flowai"
```

```yaml
name: flow-pipelines
version: "2.0.0"
description: "Multi-step SDLC automation with role-specific subagents"
author: korchasa
repository: "https://github.com/korchasa/flowai"
hooks:
  - name: validate-artifact
    description: "Validates SDLC pipeline artifact structure"
    event: PostToolUse
    matcher: Write
    script: hooks/validate-artifact.sh
```

flowai генерирует из pack.yaml → plugin.json:
```json
{
  "name": "flow",
  "version": "2.0.0",
  "description": "Everyday development workflow — planning, coding, review, init, debugging",
  "author": { "name": "korchasa", "url": "https://github.com/korchasa" },
  "repository": "https://github.com/korchasa/flowai",
  "skills": "./skills/",
  "agents": "./agents/"
}
```

flowai генерирует hooks.json (если есть hooks в pack.yaml):
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate-artifact.sh"
      }]
    }]
  }
}
```

### Структура packs (в репо)

```
framework/
  packs/
    flow/                              # базовый pack, ставится всегда
      pack.yaml
      skills/
        plan/SKILL.md
        commit/SKILL.md
        review/SKILL.md
        review-and-commit/SKILL.md
        init/
          SKILL.md
          assets/...
          scripts/...
          benchmarks/
            basic/mod.ts
            brownfield/mod.ts
        investigate/SKILL.md
        answer/SKILL.md
        spec/SKILL.md
        reflect/SKILL.md
        maintenance/SKILL.md
        update/SKILL.md
        fix-tests/SKILL.md
        configure-deno-commands/SKILL.md
        setup-ai-ide-devcontainer/SKILL.md
        write-gods-tasks/SKILL.md
      agents/
        diff-specialist.md
        console-expert.md
        skill-executor.md
        reflection-protocol.md

    flow-deno-application/
      pack.yaml
      skills/
        deno-deploy/SKILL.md
        code-style-ts-deno/SKILL.md
        code-style-ts-strict/SKILL.md

    flow-content/
      pack.yaml
      skills/
        write-dep/SKILL.md
        write-prd/SKILL.md
        write-in-informational-style/SKILL.md
        draw-mermaid-diagrams/SKILL.md
        engineer-prompts-for-instant/SKILL.md
        engineer-prompts-for-reasoning/SKILL.md
        interactive-teaching-materials/SKILL.md
        conduct-qa-session/SKILL.md

    flow-ide-extend/
      pack.yaml
      skills/
        engineer-skill/SKILL.md
        engineer-command/SKILL.md
        engineer-subagent/SKILL.md
        engineer-rule/SKILL.md
        engineer-hook/SKILL.md
        write-agent-benchmarks/SKILL.md
        cursor-agent-integration/SKILL.md
        example/SKILL.md

    flow-research/
      pack.yaml
      skills/
        deep-research/SKILL.md
        analyze-context/SKILL.md
      agents/
        deep-research-worker.md

    flow-browser/
      pack.yaml
      skills/
        browser-automation/SKILL.md
        playwright-cli/SKILL.md

    flow-github/
      pack.yaml
      skills/
        manage-github-tickets/SKILL.md
        manage-github-tickets-by-mcp/SKILL.md

    flow-pipelines/
      pack.yaml
      skills/
        sdlc-pipeline/SKILL.md
        engineer-pipeline/SKILL.md
      agents/
        shared-rules.md
        agent-pm.md
        agent-architect.md
        agent-tech-lead.md
        agent-developer.md
        agent-qa.md
        agent-tech-lead-review.md
      hooks/
        validate-artifact.sh
      scripts/
        hitl-ask.sh
        hitl-check.sh
```

### .flowai.yaml v2

```yaml
version: "2.0"
ides: [claude]
packs: [flow-content, flow-deno-application]   # pack "flow" implicit
reflection:
  enabled: true
  path: ".flow/memory"
skills:
  exclude: [interactive-teaching-materials]     # имена без префикса
agents:
  exclude: []
```

Семантика:
- Pack `flow` ставится **всегда**, не нужно указывать
- `packs: [...]` — дополнительные packs
- `packs` отсутствует + `version: "1.0"` → всё ставится (обратная совместимость)
- `reflection.enabled` — двуслойная память для agents (default: false)
- `skills.exclude` — после раскрытия packs, имена без префикса

### Генерация при sync

**Claude Code:**
```
flowai sync
  1. Всегда: генерировать plugin dir для pack "flow"
  2. Для каждого доп. pack из .flowai.yaml packs:
     → Создать .flow/plugins/<pack-name>/
     → Скопировать skills/, agents/
     → Генерировать .claude-plugin/plugin.json из pack.yaml
     → Если hooks: скопировать скрипты + генерировать hooks/hooks.json
     → Если reflection.enabled: подставить templates в agents
  3. Прописать plugins в .claude/settings.json
  4. Clean: удалить orphaned plugin dirs + старые flow-* ресурсы в .claude/skills/
```

Output:
```
.flow/
  plugins/
    flow/
      .claude-plugin/plugin.json
      skills/
        plan/SKILL.md
        commit/SKILL.md
        ...
      agents/
        diff-specialist.md
        ...
    flow-content/
      .claude-plugin/plugin.json
      skills/
        write-dep/SKILL.md
        ...
    flow-pipelines/
      .claude-plugin/plugin.json
      skills/...
      agents/...
      hooks/
        hooks.json
        validate-artifact.sh

.claude/settings.json:
  { "plugins": [".flow/plugins/flow", ".flow/plugins/flow-content", ".flow/plugins/flow-pipelines"] }
```

**Cursor/OpenCode:**
```
flowai sync
  1. Для каждого pack (flow + доп.):
     → Скопировать skills/ → .cursor/skills/ (без namespace — flat)
     → Скопировать agents/ → .cursor/agents/ (с agent transform)
     → Hooks: трансформировать в IDE-формат
     → Если reflection.enabled: подставить templates
  2. Clean: удалить старые flow-* ресурсы из .cursor/skills/, .cursor/agents/
```

### Packs (8 штук)

**flow** (15 skills, 4 agents) — базовый, всегда:
- plan, spec, investigate, answer, commit, review, review-and-commit, init, maintenance, update, reflect, fix-tests
- configure-deno-commands, setup-ai-ide-devcontainer (setup-делегаты)
- write-gods-tasks (базовый формат)
- Agents: diff-specialist, console-expert, skill-executor, reflection-protocol

**flow-deno-application** (3 skills) — Deno/TS проект:
- deno-deploy, code-style-ts-deno, code-style-ts-strict

**flow-content** (8 skills) — создание контента:
- write-dep, write-prd, write-in-informational-style, draw-mermaid-diagrams, engineer-prompts-for-instant, engineer-prompts-for-reasoning, interactive-teaching-materials, conduct-qa-session

**flow-ide-extend** (8 skills) — расширение IDE:
- engineer-skill, engineer-command, engineer-subagent, engineer-rule, engineer-hook, write-agent-benchmarks, cursor-agent-integration, example

**flow-research** (2 skills, 1 agent):
- deep-research, analyze-context
- Agent: deep-research-worker

**flow-browser** (2 skills):
- browser-automation, playwright-cli

**flow-github** (2 skills):
- manage-github-tickets, manage-github-tickets-by-mcp

**flow-pipelines** (2 skills, 7 agents, 1 hook, 2 scripts):
- Skills: sdlc-pipeline, engineer-pipeline
- Agents: shared-rules, agent-pm, agent-architect, agent-tech-lead, agent-developer, agent-qa, agent-tech-lead-review
- Hooks: validate-artifact
- Scripts: hitl-ask, hitl-check

### Reflection: опция + agent templates

```yaml
reflection:
  enabled: true
  path: ".flow/memory"
```

Agent template:
```markdown
---
name: diff-specialist
description: "Git diff analysis specialist"
---
# Role: Diff Specialist
...

{{reflection_instructions}}
```

При `reflection.enabled: true`:
```markdown
## Reflection Memory
- Memory: .flow/memory/diff-specialist.md
- History: .flow/memory/diff-specialist-history.md
- At session start: read both files
- At session end: rewrite memory (≤50 lines), append to history (≤20 entries)
```

Memory: `.flow/memory/` → `.gitignore`. History tracked.

### Проверка замкнутости зависимостей

CI (`deno task check`):
1. Парсит SKILL.md на ссылки на другие skills
2. Для каждой: target в том же pack?
3. Если нет → ошибка

### Pack versioning

v1: version в pack.yaml = flowai version. Используется для plugin.json.
Будущее: `min_flowai` когда понадобится.

### Этапы реализации

**Phase 1: Структура и миграция**
1. Создать `framework/packs/` со всеми 8 packs + pack.yaml
2. Перенести и переименовать skills (убрать flow-/flow-skill- prefix)
3. Перенести и переименовать agents
4. Перенести benchmarks
5. Удалить `framework/skills/`, `framework/agents/`
6. Обновить benchmark runner
7. Проверка замкнутости зависимостей в CI
8. Обновить bundle script

**Phase 2: flowai v2**
1. PackDefinition тип
2. Генераторы: pack.yaml → plugin.json, hooks.json
3. config.ts: `.flowai.yaml` v2 (packs, reflection)
4. sync.ts: Claude Code — plugin dirs + settings.json; Cursor/OpenCode — раскладка
5. Pack `flow` implicit (всегда ставится)
6. Clean sync
7. Обратная совместимость v1
8. `flowai list-packs`
9. Тесты

**Phase 3: Reflection**
1. Agent template engine
2. `.flow/memory/` management
3. Тесты

**Phase 4: Pipelines pack**
1. Перенести из auto-flow2
2. Адаптировать sdlc-pipeline
3. Создать engineer-pipeline
4. Benchmarks

**Phase 5: Graceful delegation**
1. init: skip при отсутствии skill из другого pack
2. update: аналогично
3. Benchmarks

### Открытые вопросы

1. **Plugin marketplace**: публиковать packs в Claude Code marketplace?
2. **.flow/ directory**: gitignore целиком? plugins/ — да. memory/ — snapshot gitignore, history tracked
3. **Cursor/OpenCode naming**: skills раскладываются flat без namespace. Конфликт с пользовательскими skills маловероятен но возможен
