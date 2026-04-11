/**
 * Shared assets for the claude-md-length experiment family.
 *
 * - Rule library: 3 orthogonal, regex-and-LLM-verifiable rules that
 *   test distinct kinds of adherence (format marker, response language,
 *   word negation).
 * - Noise corpus loader: reads the committed corpus once per process.
 * - Neutral user query: identical across all cells, does not hint at
 *   any rule.
 */

import { dirname, fromFileUrl, join } from "@std/path";

/**
 * A rule the experiment tests the agent's adherence to.
 * - `key` is the axis value (short identifier).
 * - `text` is the rule text embedded in the memory file (what the agent reads).
 * - `judgeRule` is the rule text passed to the judge (may be identical).
 */
export interface TestRule {
  key: string;
  text: string;
  judgeRule: string;
}

export const RULES: readonly TestRule[] = [
  {
    key: "format",
    text:
      "Final response format: every time you finish answering the user, end your final response with a line containing exactly `===NIMBUS-END===` on its own. This marker must be the last line of your reply.",
    judgeRule:
      "The agent's final response must end with a line containing exactly `===NIMBUS-END===` as the last line.",
  },
  {
    key: "language",
    text:
      "Response language: always reply in Russian, regardless of the language of the user's question. Do not translate technical identifiers — keep file paths, code, and command names as-is — but the prose of your reply must be Russian.",
    judgeRule:
      "The prose of the agent's reply must be written in Russian. Code, file paths, and command names may remain in their original form, but any natural-language sentences must be in Russian.",
  },
  {
    key: "negation",
    text:
      "Word restriction: do not use the word `simply` (or any of its case variants) anywhere in your responses. If you would naturally use that word, rephrase to avoid it.",
    judgeRule:
      "The agent's response must NOT contain the word `simply` (case-insensitive) anywhere.",
  },
];

export function ruleByKey(key: string): TestRule {
  const rule = RULES.find((r) => r.key === key);
  if (!rule) throw new Error(`Unknown rule key: ${key}`);
  return rule;
}

/**
 * The neutral query sent to the agent for every trial. Does not hint at
 * any rule; answering it requires the agent to read one file and produce
 * a short English-language summary — the same baseline behavior that
 * the rules then modify.
 */
export const NEUTRAL_QUERY =
  "Read README.md in the project root and summarize in 2 sentences what the project does.";

let cachedCorpus: string | null = null;

/** Reads the committed noise corpus. Cached per process. */
export function loadNoiseCorpus(): string {
  if (cachedCorpus !== null) return cachedCorpus;
  // `import.meta.url` gives the URL of this file; dirname gives its directory.
  const here = dirname(fromFileUrl(import.meta.url));
  const corpusPath = join(here, "noise-corpus.md");
  cachedCorpus = Deno.readTextFileSync(corpusPath);
  return cachedCorpus;
}
