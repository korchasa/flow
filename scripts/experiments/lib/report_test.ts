import { assertEquals } from "@std/assert";
import { computeAdherenceByAxis, renderMarkdown } from "./report.ts";
import type { TrialResult } from "./types.ts";

function mkTrial(
  axes: Record<string, string | number>,
  trial: number,
  pass: boolean,
): TrialResult {
  return {
    cell: { axes, trial },
    pass,
    judgeReason: pass ? "ok" : "no",
    agentOutput: "",
    durationMs: 1000,
    exitCode: 0,
  };
}

Deno.test("computeAdherenceByAxis: groups by primary axis value", () => {
  const trials: TrialResult[] = [
    mkTrial({ tokens: 1000, rule: "format" }, 0, true),
    mkTrial({ tokens: 1000, rule: "format" }, 1, true),
    mkTrial({ tokens: 1000, rule: "language" }, 0, false),
    mkTrial({ tokens: 2000, rule: "format" }, 0, true),
    mkTrial({ tokens: 2000, rule: "language" }, 0, false),
    mkTrial({ tokens: 2000, rule: "language" }, 1, false),
  ];
  const result = computeAdherenceByAxis(trials, "tokens");
  assertEquals(result["1000"], 2 / 3); // 2 of 3 passed
  assertEquals(result["2000"], 1 / 3); // 1 of 3 passed
});

Deno.test("computeAdherenceByAxis: handles empty trials", () => {
  assertEquals(computeAdherenceByAxis([], "tokens"), {});
});

Deno.test("computeAdherenceByAxis: single cell all pass → 1.0", () => {
  const trials = [
    mkTrial({ tokens: 500 }, 0, true),
    mkTrial({ tokens: 500 }, 1, true),
  ];
  assertEquals(computeAdherenceByAxis(trials, "tokens"), { "500": 1.0 });
});

Deno.test("renderMarkdown: contains headline and token table", () => {
  const md = renderMarkdown({
    schemaVersion: 1,
    experimentId: "claude-md-length-single-file",
    experimentName: "CLAUDE.md length (single file)",
    model: "claude-opus-4-6",
    ide: "claude",
    startedAt: "2026-04-11T10:00:00Z",
    finishedAt: "2026-04-11T11:00:00Z",
    seed: 1,
    reps: 5,
    axes: { tokens: [500, 1000], rule: ["format", "language"] },
    trials: [
      mkTrial({ tokens: 500, rule: "format" }, 0, true),
      mkTrial({ tokens: 1000, rule: "format" }, 0, false),
    ],
    adherenceByAxis: { tokens: { "500": 1.0, "1000": 0.0 } },
    durationMs: 3600_000,
    headline: "Max safe tokens: 500",
  });
  if (!md.includes("Max safe tokens: 500")) {
    throw new Error("headline missing");
  }
  if (!md.includes("| 500 |") && !md.includes("|500|")) {
    throw new Error("size 500 missing from table");
  }
  if (!md.includes("claude-opus-4-6")) {
    throw new Error("model missing");
  }
});
