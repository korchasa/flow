# Перенос сценариев и рабочих папок бенчмарков в корень проекта

## Goal

Перенести сценарии бенчмарков и их рабочие папки (sandbox, runs) в единую директорию `benchmarks/` в корне проекта для упрощения структуры и изоляции артефактов тестирования.

## Overview

### Context

В текущей реализации сценарии бенчмарков и их результаты распределены по нескольким местам:
1.  `catalog/skills/*/benchmarks/` — сценарии, привязанные к конкретным навыкам.
2.  `scripts/benchmarks/scenarios/` — устаревшие (legacy) сценарии.
3.  `catalog/skills/*/benchmarks/runs/` — рабочие папки (sandbox) для сценариев навыков.
4.  `benchmarks/` — рабочие папки для глобальных сценариев.

Это усложняет навигацию, очистку артефактов и нарушает принцип чистоты каталога навыков (`catalog/`), который должен содержать только "продуктовые" файлы.

### Current State

-   `scripts/task-bench.ts` ищет сценарии в `catalog/skills` и `scripts/benchmarks/scenarios`.
-   `scripts/benchmarks/lib/runner.ts` определяет `workDir` на основе наличия поля `skill` в сценарии.
-   `scripts/benchmarks/lib/runner.ts` пытается найти `fixture` по относительному пути от `mod.ts` или по жестко заданным правилам для `af-*`.

### Constraints

-   Необходимо сохранить работоспособность всех существующих бенчмарков.
-   Пути к `fixture` должны определяться корректно после переноса.
-   Нужно обновить `deno.json` (если там есть ссылки на старые пути) и документацию.
-   Сценарии должны быть организованы по подпапкам (например, `benchmarks/scenarios/af-commit/...`).

## Definition of Done

- [x] Все сценарии из `catalog/skills/*/benchmarks/` перенесены в `benchmarks/scenarios/`.
- [x] Все сценарии из `scripts/benchmarks/scenarios/` перенесены в `benchmarks/scenarios/`.
- [x] Директории `catalog/skills/*/benchmarks/` удалены.
- [x] Директория `scripts/benchmarks/scenarios/` удалена.
- [x] `scripts/task-bench.ts` обновлен для поиска сценариев только в `benchmarks/scenarios`.
- [x] `scripts/benchmarks/lib/runner.ts` обновлен: `workDir` всегда указывает на `benchmarks/runs/`.
- [x] Логика поиска `fixture` в `runner.ts` адаптирована под новую структуру.
- [x] `deno task bench` успешно находит и запускает сценарии.
- [x] `benchmarks.lock` и `benchmarks.config.json` перенесены внутрь `benchmarks/`.
- [x] Рабочие папки бенчмарков добавлены в `.gitignore`.

## Solution

### 1. Подготовка новой структуры
- [x] Создать директорию `benchmarks/scenarios`.
- [x] Создать директорию `benchmarks/runs`.

### 2. Перенос файлов
- [x] Перенести все сценарии из `catalog/skills/*/benchmarks/scenarios/` (если есть) или `catalog/skills/*/benchmarks/` в `benchmarks/scenarios/`.
- [x] Перенести все сценарии из `scripts/benchmarks/scenarios/` в `benchmarks/scenarios/`.
- [x] Перенести `benchmarks.config.json` в `benchmarks/config.json`.
- [ ] Удалить старые директории `benchmarks` внутри `catalog/skills/*/`.
- [ ] Удалить `scripts/benchmarks/scenarios/`.

### 3. Обновление кода (Инфраструктура)
- [x] **`scripts/task-bench.ts`**:
    - [x] Обновить путь к `lockFile`: `benchmarks/benchmarks.lock`.
    - [x] Обновить `discoverScenarios`: искать только в `benchmarks/scenarios`.
    - [x] Обновить `getWorkDir`: всегда возвращать `benchmarks/runs`.
- [x] **`scripts/benchmarks/lib/runner.ts`**:
    - [x] Обновить логику поиска `fixturePath`. Теперь она должна быть относительной новой структуры в `benchmarks/scenarios/`.
    - [x] Убрать специфичную логику для `catalog/skills` и `scripts/benchmarks/scenarios`.
    - [x] Убедиться, что `scenarioDir` и `sandboxPath` создаются внутри `options.workDir` (который теперь `benchmarks/runs`).
- [x] **`scripts/benchmarks/lib/llm.ts`**:
    - [x] Обновить путь загрузки конфига по умолчанию на `benchmarks/config.json`.

### 4. Обновление путей в сценариях
- [x] Проверить `mod.ts` перенесенных сценариев на наличие относительных импортов (например, `../../../../scripts/benchmarks/lib/types.ts`) и обновить их на корректные (теперь будет меньше уровней вложенности или другой путь).

### 5. Верификация
- [x] Запустить `deno task bench --help` для проверки загрузки конфига.
- [x] Запустить один из бенчмарков (например, `af-commit-atomic-docs`) и проверить создание sandbox в `benchmarks/runs`.
- [x] Проверить отсутствие файлов бенчмарков в `catalog/`.
- [x] Запустить `deno task check` для общей проверки проекта.
- [x] Добавить рабочие папки бенчмарков в `.gitignore`.

