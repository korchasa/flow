/**
 * Deterministic noise content builder for memory-file experiments.
 *
 * Given a corpus of non-directive markdown (split by H2 sections) and a
 * target token budget, emits a concatenation of corpus sections sized to
 * hit the budget (±5%). Uses a seeded PRNG so the same inputs always
 * yield the same output — critical for experiment reproducibility.
 */

import { estimateTokens, fitToTokenBudget } from "./tokens.ts";

export interface NoiseOptions {
  corpus: string;
  targetTokens: number;
  seed: number;
}

export interface InjectOptions {
  noise: string;
  rule: string;
  /** 0 = top, 50 = middle, 100 = bottom. */
  positionPercent: number;
}

/**
 * Mulberry32 PRNG. Deterministic, uniform, fast; fine for reproducible shuffling.
 * Returns a float in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splits corpus by top-level H2 headings. Each section starts with `## `
 * and runs until the next `## ` or end-of-string. Leading content before
 * the first H2 (if any) becomes section 0.
 */
function splitSections(corpus: string): string[] {
  const lines = corpus.split("\n");
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.length > 0) sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n"));
  return sections.filter((s) => s.trim().length > 0);
}

/**
 * Fisher-Yates shuffle using a seeded PRNG. Returns a new array; does not mutate.
 */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds a noise string of approximately `targetTokens` tokens by
 * repeatedly sampling shuffled corpus sections until the budget is met.
 * If the last full section would overshoot, the remainder is trimmed
 * via fitToTokenBudget.
 */
export function buildNoise(opts: NoiseOptions): string {
  const { corpus, targetTokens, seed } = opts;
  if (targetTokens <= 0) return "";

  const sections = splitSections(corpus);
  if (sections.length === 0) {
    // Degenerate corpus: just trim the raw text.
    return fitToTokenBudget(corpus, targetTokens);
  }

  const rng = mulberry32(seed);
  const parts: string[] = [];
  let currentTokens = 0;

  // Keep generating shuffled cycles until we meet the budget.
  // Guard against runaway: cap at 1000 sections to produce to prevent infinite loops.
  let sectionsEmitted = 0;
  const maxEmit = 1000;

  while (currentTokens < targetTokens && sectionsEmitted < maxEmit) {
    const order = shuffle(
      sections.map((_, i) => i),
      rng,
    );
    for (const idx of order) {
      if (currentTokens >= targetTokens) break;
      const section = sections[idx];
      const sectionTokens = estimateTokens(section);
      const remaining = targetTokens - currentTokens;
      if (sectionTokens <= remaining) {
        parts.push(section);
        currentTokens += sectionTokens;
      } else {
        // Trim this section to exactly fit remaining budget.
        const trimmed = fitToTokenBudget(section, remaining);
        if (trimmed.length > 0) {
          parts.push(trimmed);
          currentTokens += estimateTokens(trimmed);
        }
        break;
      }
      sectionsEmitted++;
    }
  }

  return parts.join("\n\n");
}

/**
 * Injects a rule section into noise content at the specified line-percentage
 * position. The rule is wrapped in a "## Critical Rule" H2 so it visually
 * matches the surrounding noise sections.
 *
 * Position semantics:
 * - 0   → rule before line 0 (top)
 * - 50  → rule after 50% of lines (middle)
 * - 100 → rule after last line (bottom)
 */
export function injectRule(opts: InjectOptions): string {
  const { noise, rule, positionPercent } = opts;
  const clamped = Math.max(0, Math.min(100, positionPercent));
  const lines = noise.split("\n");
  const insertAt = Math.round((lines.length * clamped) / 100);

  const ruleBlock = [
    "",
    "## Critical Rule",
    "",
    rule,
    "",
  ].join("\n");

  const before = lines.slice(0, insertAt).join("\n");
  const after = lines.slice(insertAt).join("\n");
  return [before, ruleBlock, after].filter((s) => s.length > 0).join("\n");
}
