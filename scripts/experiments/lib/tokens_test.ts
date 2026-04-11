import { assertAlmostEquals, assertEquals } from "@std/assert";
import { estimateTokens, fitToTokenBudget } from "./tokens.ts";

Deno.test("estimateTokens: empty string is 0", () => {
  assertEquals(estimateTokens(""), 0);
});

Deno.test("estimateTokens: scales roughly 1 token per 4 chars", () => {
  // 400 chars → ~100 tokens (±10%)
  const text = "a".repeat(400);
  assertAlmostEquals(estimateTokens(text), 100, 10);
});

Deno.test("estimateTokens: monotonic in length", () => {
  const short = estimateTokens("hello world");
  const long = estimateTokens("hello world ".repeat(10));
  // Ten repetitions should yield ~10× more tokens (allow for slack)
  if (!(long > short * 5)) {
    throw new Error(`expected long (${long}) > 5*short (${short * 5})`);
  }
});

Deno.test("fitToTokenBudget: returns input as-is if already under budget", () => {
  const input = "hello";
  const result = fitToTokenBudget(input, 1000);
  assertEquals(result, input);
});

Deno.test("fitToTokenBudget: trims to approximately target tokens", () => {
  const long = "word ".repeat(2000); // ~2000 tokens at 4 chars/token (5 chars per word including space)
  const trimmed = fitToTokenBudget(long, 100);
  const got = estimateTokens(trimmed);
  // Within ±10% of target
  if (got > 110 || got < 90) {
    throw new Error(`fitToTokenBudget: got ${got}, expected ~100 (±10)`);
  }
});

Deno.test("fitToTokenBudget: preserves UTF-8 boundary (no broken chars)", () => {
  const text = "привет мир ".repeat(200);
  const trimmed = fitToTokenBudget(text, 50);
  // Should decode back without replacement chars
  if (trimmed.includes("\uFFFD")) {
    throw new Error("fitToTokenBudget broke UTF-8");
  }
});
