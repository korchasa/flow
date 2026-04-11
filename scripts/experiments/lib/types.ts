/**
 * Contracts for the experiments subsystem.
 *
 * Experiments are parameterized empirical studies that sweep axes,
 * produce numeric results, and commit them as evidence. Distinct from
 * benchmarks (pass/fail regression tests for primitives).
 */

import type { AgentAdapter } from "../../benchmarks/lib/adapters/types.ts";

/** One point in the cartesian product of an experiment's axes. */
export interface Cell {
  /** Axis values for this cell (e.g. {tokens: 1000, rule: "format"}). */
  axes: Record<string, string | number>;
  /** Trial index within this cell (0..reps-1). */
  trial: number;
}

/** Context passed to `Experiment.setupCell`. */
export interface CellContext {
  /** Sandbox directory prepared by the runner (empty or with init). */
  sandboxPath: string;
  /** IDE adapter selected for this run (for memory-file writes, etc.). */
  adapter: AgentAdapter;
  /** Deterministic seed derived from cell axes + trial. */
  seed: number;
}

/** A single-rule binary evaluation request to the judge. */
export interface JudgeRequest {
  /** The rule being evaluated, in plain English. */
  rule: string;
  /** The original query the agent received (for the judge to understand context). */
  userQuery: string;
}

/** Result of one trial (single agent run + single judge evaluation). */
export interface TrialResult {
  cell: Cell;
  pass: boolean;
  judgeReason: string;
  agentOutput: string;
  durationMs: number;
  exitCode: number;
  tokensUsed?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  error?: string;
}

/** Experiment definition. One file exports one of these. */
export interface Experiment {
  /** Unique identifier, e.g. "claude-md-length-single-file". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-paragraph description of what this experiment measures. */
  description: string;
  /** Axes to sweep (cartesian product). Order affects display only. */
  axes: Record<string, ReadonlyArray<string | number>>;
  /** Default parameters; CLI flags override. */
  defaults: {
    reps: number;
    model?: string;
    ide?: string;
  };
  /** Prepare the sandbox for a specific cell (write memory files, etc.). */
  setupCell(cell: Cell, ctx: CellContext): Promise<void>;
  /** Prompt the agent receives. Must NOT hint at the rule under test. */
  query(cell: Cell): string;
  /** Rule evaluation request for the judge. */
  judgePrompt(cell: Cell): JudgeRequest;
  /** Compute the headline number from a completed report. */
  headline(report: ExperimentReport): string;
}

/** Committed result artifact. */
export interface ExperimentReport {
  schemaVersion: 1;
  experimentId: string;
  experimentName: string;
  model: string;
  ide: string;
  startedAt: string; // ISO timestamp
  finishedAt: string; // ISO timestamp
  seed: number;
  reps: number;
  /** Axes that were actually swept (may be filtered by CLI). */
  axes: Record<string, ReadonlyArray<string | number>>;
  trials: TrialResult[];
  /** Adherence (0..1) grouped by primary axis value (e.g. tokens → rate). */
  adherenceByAxis: Record<string, Record<string, number>>;
  /** Total wallclock duration in ms. */
  durationMs: number;
  /** Final one-line summary (from Experiment.headline). */
  headline: string;
}
