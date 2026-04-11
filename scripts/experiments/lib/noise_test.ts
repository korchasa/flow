import { assertEquals } from "@std/assert";
import { buildNoise, injectRule } from "./noise.ts";
import { estimateTokens } from "./tokens.ts";

const CORPUS = [
  "## Section A",
  "",
  "Alpha content line one.",
  "Alpha content line two.",
  "",
  "## Section B",
  "",
  "Beta content line one.",
  "Beta content line two.",
  "",
  "## Section C",
  "",
  "Gamma content line one.",
  "Gamma content line two.",
  "",
].join("\n");

Deno.test("buildNoise: deterministic — same seed yields same output", () => {
  const a = buildNoise({ corpus: CORPUS, targetTokens: 50, seed: 42 });
  const b = buildNoise({ corpus: CORPUS, targetTokens: 50, seed: 42 });
  assertEquals(a, b);
});

Deno.test("buildNoise: different seeds yield different outputs", () => {
  const a = buildNoise({ corpus: CORPUS, targetTokens: 200, seed: 1 });
  const b = buildNoise({ corpus: CORPUS, targetTokens: 200, seed: 2 });
  if (a === b) {
    throw new Error("buildNoise: different seeds produced identical output");
  }
});

Deno.test("buildNoise: hits target token count within ±10%", () => {
  const target = 500;
  const result = buildNoise({ corpus: CORPUS, targetTokens: target, seed: 7 });
  const got = estimateTokens(result);
  const lo = Math.floor(target * 0.9);
  const hi = Math.ceil(target * 1.1);
  if (got < lo || got > hi) {
    throw new Error(`buildNoise got ${got} tokens, expected ${lo}-${hi}`);
  }
});

Deno.test("buildNoise: extends corpus by repeating sections when too short", () => {
  // Corpus is ~30 tokens, target 300 → must repeat sections
  const target = 300;
  const result = buildNoise({ corpus: CORPUS, targetTokens: target, seed: 3 });
  const got = estimateTokens(result);
  if (got < 270 || got > 330) {
    throw new Error(`expected ~${target}, got ${got}`);
  }
});

Deno.test("buildNoise: handles target smaller than one section", () => {
  const result = buildNoise({ corpus: CORPUS, targetTokens: 5, seed: 1 });
  const got = estimateTokens(result);
  // Small target should be respected (≤ 5 + small slack)
  if (got > 10) {
    throw new Error(`target=5, got ${got} (should be ≤10)`);
  }
});

Deno.test("injectRule: rule appears in output", () => {
  const noise = "line1\nline2\nline3\nline4\nline5";
  const out = injectRule({
    noise,
    rule: "Always say banana.",
    positionPercent: 50,
  });
  if (!out.includes("Always say banana.")) {
    throw new Error("injectRule: rule missing from output");
  }
});

Deno.test("injectRule: position 0 puts rule near top", () => {
  const noise = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
  const out = injectRule({
    noise,
    rule: "RULE_MARKER",
    positionPercent: 0,
  });
  const lines = out.split("\n");
  const ruleIdx = lines.findIndex((l) => l.includes("RULE_MARKER"));
  if (ruleIdx > 10) {
    throw new Error(`position 0 placed rule at line ${ruleIdx}, expected ≤10`);
  }
});

Deno.test("injectRule: position 100 puts rule near bottom", () => {
  const noise = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
  const out = injectRule({
    noise,
    rule: "RULE_MARKER",
    positionPercent: 100,
  });
  const lines = out.split("\n");
  const ruleIdx = lines.findIndex((l) => l.includes("RULE_MARKER"));
  // Should be within the last 10% of the file
  if (ruleIdx < 90) {
    throw new Error(
      `position 100 placed rule at line ${ruleIdx}, expected ≥90`,
    );
  }
});

Deno.test("injectRule: preserves all noise content", () => {
  const noise = "line1\nline2\nline3";
  const out = injectRule({
    noise,
    rule: "R",
    positionPercent: 50,
  });
  for (const l of ["line1", "line2", "line3"]) {
    if (!out.includes(l)) throw new Error(`lost line: ${l}`);
  }
});
