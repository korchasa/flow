/**
 * Sweep runner for experiments.
 *
 * Iterates the cartesian product of axes × reps, runs one agent trial
 * per cell, judges adherence, and aggregates into an ExperimentReport.
 *
 * Designed for testability: the agent spawn and judge calls are
 * injected via function parameters (defaults hit the real Claude CLI).
 */

import { join } from "@std/path";
import type {
  Cell,
  CellContext,
  Experiment,
  ExperimentReport,
  TrialResult,
} from "./types.ts";
import type { AgentAdapter } from "../../benchmarks/lib/adapters/types.ts";
import type { ModelConfig } from "../../benchmarks/lib/llm.ts";
import { judgeAdherence, type JudgeVerdict } from "./judge.ts";
import {
  computeAdherenceByAxis,
  computeHeadlineMaxSafeTokens,
} from "./report.ts";

/** Result of spawning one agent trial (abstracts SpawnedAgent for testability). */
export interface AgentTrialOutcome {
  output: string;
  exitCode: number;
  tokens?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
}

export type SpawnAgentFn = (opts: {
  sandbox: string;
  model: string;
  prompt: string;
  adapter: AgentAdapter;
  stepTimeoutMs: number;
  name?: string;
  /** Extra env vars merged into the spawned process (cleanroom isolation). */
  env?: Record<string, string>;
}) => Promise<AgentTrialOutcome>;

export type JudgeFn = (
  rule: string,
  userQuery: string,
  agentOutput: string,
  judgeConfig: ModelConfig,
) => Promise<JudgeVerdict>;

export interface RunnerOptions {
  experiment: Experiment;
  /** Variant label for the result filename (e.g. "single-file"). */
  variant: string;
  model: string;
  ide: string;
  adapter: AgentAdapter;
  reps: number;
  /** Base seed for deterministic trial setup. */
  seed: number;
  /** Optional filter — override experiment.axes (e.g. from CLI --sizes 500,1000). */
  axesFilter?: Record<string, ReadonlyArray<string | number>>;
  /** Judge model config. */
  judgeConfig: ModelConfig;
  /** Timeout per single trial. Default 300s. */
  stepTimeoutMs?: number;
  /** Progress callback (cell + result). */
  onProgress?: (index: number, total: number, result: TrialResult) => void;
  /** Injection points for testing. */
  spawnAgent?: SpawnAgentFn;
  judge?: JudgeFn;
}

/**
 * Expands an axes map into the full cartesian product of cells.
 * Order of keys determines nesting order (first key outermost loop).
 */
export function expandCells(
  axes: Record<string, ReadonlyArray<string | number>>,
  reps: number,
): Cell[] {
  const keys = Object.keys(axes);
  if (keys.length === 0) {
    return Array.from({ length: reps }, (_, trial) => ({
      axes: {},
      trial,
    }));
  }
  const combos: Array<Record<string, string | number>> = [{}];
  for (const key of keys) {
    const values = axes[key];
    const next: Array<Record<string, string | number>> = [];
    for (const combo of combos) {
      for (const v of values) {
        next.push({ ...combo, [key]: v });
      }
    }
    combos.length = 0;
    combos.push(...next);
  }
  const cells: Cell[] = [];
  for (const combo of combos) {
    for (let trial = 0; trial < reps; trial++) {
      cells.push({ axes: combo, trial });
    }
  }
  return cells;
}

/**
 * Deterministic seed derived from cell axes + trial index.
 * Ensures that re-running the same (cell, trial) produces the same setup.
 */
export function cellSeed(baseSeed: number, cell: Cell): number {
  let hash = baseSeed >>> 0;
  const str = JSON.stringify(cell.axes) + `|${cell.trial}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Runs all cells and produces an ExperimentReport. */
export async function runExperiment(
  opts: RunnerOptions,
): Promise<ExperimentReport> {
  const {
    experiment,
    variant,
    model,
    ide,
    adapter,
    reps,
    seed,
    axesFilter,
    judgeConfig,
    stepTimeoutMs = 300_000,
    onProgress,
  } = opts;

  const spawnAgent = opts.spawnAgent ?? defaultSpawnAgent;
  const judge = opts.judge ?? defaultJudge;

  // Cleanroom: create one empty config dir for the whole run, fetch
  // adapter-specific env (e.g. CLAUDE_CONFIG_DIR + OAuth token), and
  // pass it to every trial. This prevents the spawned agent from
  // loading the user's global memory files.
  let cleanroomEnv: Record<string, string> = {};
  let cleanroomConfigDir: string | undefined;
  try {
    cleanroomConfigDir = await Deno.makeTempDir({
      prefix: "flowai-exp-cleanroom-",
    });
    cleanroomEnv = await adapter.getCleanroomEnv(cleanroomConfigDir);
  } catch (e) {
    // If the adapter cannot produce a cleanroom env (e.g. missing
    // keychain access), we fail loudly: experiment results would be
    // contaminated otherwise.
    if (cleanroomConfigDir) {
      try {
        await Deno.remove(cleanroomConfigDir, { recursive: true });
      } catch (_) { /* ignore */ }
    }
    throw new Error(
      `Cannot start experiment: cleanroom env setup failed for IDE "${adapter.ide}": ${
        (e as Error).message
      }`,
    );
  }

  const effectiveAxes = axesFilter ?? experiment.axes;
  const cells = expandCells(effectiveAxes, reps);
  const total = cells.length;
  const trials: TrialResult[] = [];
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const result = await runSingleCell({
        cell,
        experiment,
        model,
        adapter,
        seed: cellSeed(seed, cell),
        judgeConfig,
        stepTimeoutMs,
        spawnAgent,
        judge,
        variant,
        cleanroomEnv,
      });
      trials.push(result);
      onProgress?.(i + 1, total, result);
    }
  } finally {
    if (cleanroomConfigDir) {
      try {
        await Deno.remove(cleanroomConfigDir, { recursive: true });
      } catch (_) { /* ignore */ }
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = performance.now() - t0;

  const adherenceByAxis: Record<string, Record<string, number>> = {};
  for (const key of Object.keys(effectiveAxes)) {
    adherenceByAxis[key] = computeAdherenceByAxis(trials, key);
  }

  const report: ExperimentReport = {
    schemaVersion: 1,
    experimentId: experiment.id,
    experimentName: experiment.name,
    model,
    ide,
    startedAt,
    finishedAt,
    seed,
    reps,
    axes: effectiveAxes,
    trials,
    adherenceByAxis,
    durationMs,
    headline: "", // filled below
  };

  report.headline = experiment.headline(report) ||
    defaultHeadline(adherenceByAxis);

  return report;
}

/** Runs one trial end-to-end: setup → agent → judge. */
async function runSingleCell(input: {
  cell: Cell;
  experiment: Experiment;
  model: string;
  adapter: AgentAdapter;
  seed: number;
  judgeConfig: ModelConfig;
  stepTimeoutMs: number;
  spawnAgent: SpawnAgentFn;
  judge: JudgeFn;
  variant: string;
  cleanroomEnv: Record<string, string>;
}): Promise<TrialResult> {
  const {
    cell,
    experiment,
    model,
    adapter,
    seed,
    judgeConfig,
    stepTimeoutMs,
    spawnAgent,
    judge,
    variant,
    cleanroomEnv,
  } = input;

  const sandbox = await Deno.makeTempDir({
    prefix: `flowai-exp-${experiment.id}-`,
  });
  const t0 = performance.now();
  try {
    // Minimal bootstrap: drop a README.md so the neutral query has something to read.
    await Deno.writeTextFile(
      join(sandbox, "README.md"),
      `# Project\n\nA small project used for an experiment trial.\n`,
    );

    const ctx: CellContext = {
      sandboxPath: sandbox,
      adapter,
      seed,
    };
    await experiment.setupCell(cell, ctx);

    const prompt = experiment.query(cell);
    const agentName = `${experiment.id}/${variant}/${
      JSON.stringify(cell.axes)
    }/${cell.trial}`;

    let outcome: AgentTrialOutcome;
    try {
      outcome = await spawnAgent({
        sandbox,
        model,
        prompt,
        adapter,
        stepTimeoutMs,
        name: agentName,
        env: cleanroomEnv,
      });
    } catch (e) {
      return {
        cell,
        pass: false,
        judgeReason: `agent spawn error: ${(e as Error).message}`,
        agentOutput: "",
        durationMs: performance.now() - t0,
        exitCode: -1,
        error: (e as Error).message,
      };
    }

    const judgeReq = experiment.judgePrompt(cell);
    let verdict: JudgeVerdict;
    try {
      verdict = await judge(
        judgeReq.rule,
        judgeReq.userQuery,
        outcome.output,
        judgeConfig,
      );
    } catch (e) {
      return {
        cell,
        pass: false,
        judgeReason: `judge error: ${(e as Error).message}`,
        agentOutput: outcome.output,
        durationMs: performance.now() - t0,
        exitCode: outcome.exitCode,
        error: (e as Error).message,
      };
    }

    return {
      cell,
      pass: verdict.pass,
      judgeReason: verdict.reason,
      agentOutput: outcome.output,
      durationMs: performance.now() - t0,
      exitCode: outcome.exitCode,
      tokensUsed: outcome.tokens,
    };
  } finally {
    try {
      await Deno.remove(sandbox, { recursive: true });
    } catch (_) {
      // best-effort cleanup
    }
  }
}

/**
 * Default agent spawner — uses SpawnedAgent from benchmark lib.
 * Imported lazily to keep the runner module importable in environments
 * where the benchmark infra cannot be instantiated (e.g. unit tests).
 */
const defaultSpawnAgent: SpawnAgentFn = async (opts) => {
  const { SpawnedAgent } = await import(
    "../../benchmarks/lib/spawned_agent.ts"
  );
  const agent = new SpawnedAgent({
    workspace: opts.sandbox,
    model: opts.model,
    prompt: opts.prompt,
    adapter: opts.adapter,
    maxSteps: 1,
    stepTimeout: opts.stepTimeoutMs,
    name: opts.name,
    env: opts.env,
  });
  const result = await agent.run();
  return { output: result.logs, exitCode: result.code };
};

const defaultJudge: JudgeFn = async (
  rule,
  userQuery,
  agentOutput,
  judgeConfig,
) => {
  return await judgeAdherence(
    { rule, userQuery, agentOutput },
    judgeConfig,
  );
};

function defaultHeadline(
  adherenceByAxis: Record<string, Record<string, number>>,
): string {
  const primary = "tokens" in adherenceByAxis
    ? "tokens"
    : Object.keys(adherenceByAxis)[0];
  if (!primary) return "no data";
  const safe = computeHeadlineMaxSafeTokens(adherenceByAxis, primary);
  if (safe === null) {
    return `no ${primary} value met the 80% adherence threshold`;
  }
  return `Max safe ${primary}: ${safe} at ≥80% adherence`;
}
