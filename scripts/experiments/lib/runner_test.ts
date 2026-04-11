import { assertEquals } from "@std/assert";
import {
  cellSeed,
  expandCells,
  type JudgeFn,
  runExperiment,
  type SpawnAgentFn,
} from "./runner.ts";
import type { Experiment, ExperimentReport } from "./types.ts";
import type {
  AgentAdapter,
  MemoryScope,
  ParsedAgentOutput,
} from "../../benchmarks/lib/adapters/types.ts";

/** Minimal adapter stub for tests. Records writeMemoryFile calls. */
class MockAdapter implements AgentAdapter {
  readonly ide = "claude" as const;
  readonly configDir = ".claude";
  readonly command = "mock";
  readonly outputFormat = "json" as const;
  public writes: Array<{ scope: MemoryScope; content: string }> = [];

  buildArgs(): string[] {
    return [];
  }
  parseOutput(): ParsedAgentOutput {
    return {
      sessionId: null,
      result: null,
      subtype: null,
      assistantText: null,
      raw: null,
    };
  }
  getEnv(): Record<string, string> {
    return {};
  }
  setupMocks(): Promise<void> {
    return Promise.resolve();
  }
  calculateUsage(): Promise<null> {
    return Promise.resolve(null);
  }
  getCleanroomEnv(): Promise<Record<string, string>> {
    return Promise.resolve({ MOCK_CLEAN: "1" });
  }
  writeMemoryFile(
    _sandbox: string,
    scope: MemoryScope,
    content: string,
  ): Promise<void> {
    this.writes.push({ scope, content });
    return Promise.resolve();
  }
}

// ---- expandCells ----

Deno.test("expandCells: single axis", () => {
  const cells = expandCells({ tokens: [100, 200] }, 2);
  assertEquals(cells.length, 4);
  assertEquals(cells[0], { axes: { tokens: 100 }, trial: 0 });
  assertEquals(cells[1], { axes: { tokens: 100 }, trial: 1 });
  assertEquals(cells[2], { axes: { tokens: 200 }, trial: 0 });
});

Deno.test("expandCells: cartesian product of two axes", () => {
  const cells = expandCells({ tokens: [100, 200], rule: ["a", "b"] }, 1);
  assertEquals(cells.length, 4);
  const axesSet = new Set(cells.map((c) => JSON.stringify(c.axes)));
  assertEquals(axesSet.size, 4);
});

Deno.test("expandCells: empty axes produces reps cells", () => {
  const cells = expandCells({}, 3);
  assertEquals(cells.length, 3);
  assertEquals(cells[0].trial, 0);
});

Deno.test("cellSeed: deterministic — same inputs yield same seed", () => {
  const cell = { axes: { tokens: 500 }, trial: 2 };
  assertEquals(cellSeed(42, cell), cellSeed(42, cell));
});

Deno.test("cellSeed: different cells yield different seeds", () => {
  const a = cellSeed(42, { axes: { tokens: 500 }, trial: 0 });
  const b = cellSeed(42, { axes: { tokens: 500 }, trial: 1 });
  if (a === b) throw new Error("cellSeed not varying with trial");
});

// ---- runExperiment ----

function makeExperiment(): Experiment {
  return {
    id: "test-exp",
    name: "Test Experiment",
    description: "unit test experiment",
    axes: { tokens: [100, 200], rule: ["format", "language"] },
    defaults: { reps: 2, model: "mock-model" },
    async setupCell(_cell, ctx) {
      // Write a dummy memory file to exercise the adapter
      await ctx.adapter.writeMemoryFile(
        ctx.sandboxPath,
        "root",
        "some memory",
      );
    },
    query(_cell) {
      return "neutral query";
    },
    judgePrompt(cell) {
      return {
        rule: `Rule ${cell.axes.rule}`,
        userQuery: "neutral query",
      };
    },
    headline(report) {
      return `trials: ${report.trials.length}`;
    },
  };
}

Deno.test("runExperiment: runs all cells and produces report", async () => {
  const exp = makeExperiment();
  const adapter = new MockAdapter();

  // Fake spawn: returns "PASS_FORMAT" for format rule, "PASS_LANG" for language
  const spawn: SpawnAgentFn = (opts) => {
    return Promise.resolve({
      output: `output for ${opts.name}`,
      exitCode: 0,
    });
  };

  // Fake judge: passes if output mentions "output"
  const judge: JudgeFn = (_rule, _userQuery, agentOutput) => {
    return Promise.resolve({
      pass: agentOutput.includes("output"),
      reason: agentOutput.includes("output") ? "found" : "missing",
    });
  };

  const report = await runExperiment({
    experiment: exp,
    variant: "test",
    model: "mock-model",
    ide: "claude",
    adapter,
    reps: 2,
    seed: 1,
    judgeConfig: { model: "mock-judge", temperature: 0 },
    spawnAgent: spawn,
    judge,
  });

  // 2 tokens × 2 rules × 2 reps = 8 trials
  assertEquals(report.trials.length, 8);
  assertEquals(report.model, "mock-model");
  assertEquals(report.ide, "claude");
  assertEquals(report.experimentId, "test-exp");
  assertEquals(report.headline, "trials: 8");
  // All should pass since fake judge returns pass for "output" substring
  assertEquals(report.trials.every((t) => t.pass), true);
  // Adapter should have received 8 writeMemoryFile calls
  assertEquals(adapter.writes.length, 8);
});

Deno.test("runExperiment: propagates failures from judge", async () => {
  const exp = makeExperiment();
  const adapter = new MockAdapter();

  const spawn: SpawnAgentFn = () =>
    Promise.resolve({ output: "ok", exitCode: 0 });

  // Always fail on "language" rule
  const judge: JudgeFn = (rule) =>
    Promise.resolve({
      pass: !rule.includes("language"),
      reason: rule.includes("language") ? "fail" : "pass",
    });

  const report = await runExperiment({
    experiment: exp,
    variant: "test",
    model: "mock-model",
    ide: "claude",
    adapter,
    reps: 1,
    seed: 1,
    judgeConfig: { model: "mock-judge", temperature: 0 },
    spawnAgent: spawn,
    judge,
  });

  assertEquals(report.trials.length, 4); // 2 tokens × 2 rules × 1 rep
  const langTrials = report.trials.filter((t) =>
    t.cell.axes.rule === "language"
  );
  const fmtTrials = report.trials.filter((t) => t.cell.axes.rule === "format");
  assertEquals(langTrials.every((t) => !t.pass), true);
  assertEquals(fmtTrials.every((t) => t.pass), true);
});

Deno.test("runExperiment: axesFilter overrides experiment.axes", async () => {
  const exp = makeExperiment();
  const adapter = new MockAdapter();
  const spawn: SpawnAgentFn = () =>
    Promise.resolve({ output: "ok", exitCode: 0 });
  const judge: JudgeFn = () => Promise.resolve({ pass: true, reason: "ok" });

  const report = await runExperiment({
    experiment: exp,
    variant: "test",
    model: "mock-model",
    ide: "claude",
    adapter,
    reps: 1,
    seed: 1,
    judgeConfig: { model: "mock-judge", temperature: 0 },
    axesFilter: { tokens: [500], rule: ["format"] }, // filter to 1 cell × 1 rep = 1 trial
    spawnAgent: spawn,
    judge,
  });
  assertEquals(report.trials.length, 1);
  assertEquals(report.trials[0].cell.axes.tokens, 500);
});

Deno.test("runExperiment: captures agent spawn errors as failed trials", async () => {
  const exp = makeExperiment();
  const adapter = new MockAdapter();

  const spawn: SpawnAgentFn = () => {
    throw new Error("boom");
  };
  const judge: JudgeFn = () => Promise.resolve({ pass: true, reason: "ok" });

  const report: ExperimentReport = await runExperiment({
    experiment: exp,
    variant: "test",
    model: "mock-model",
    ide: "claude",
    adapter,
    reps: 1,
    seed: 1,
    judgeConfig: { model: "mock-judge", temperature: 0 },
    axesFilter: { tokens: [100], rule: ["format"] },
    spawnAgent: spawn,
    judge,
  });
  assertEquals(report.trials.length, 1);
  assertEquals(report.trials[0].pass, false);
  if (!report.trials[0].judgeReason.includes("boom")) {
    throw new Error(
      `expected error message in judgeReason, got: ${
        report.trials[0].judgeReason
      }`,
    );
  }
});
