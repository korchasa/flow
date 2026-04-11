/**
 * Binary single-rule adherence judge for experiments.
 *
 * Thin wrapper over Claude CLI: given a target rule, the original user
 * query, and the agent's output, returns {pass, reason}. Uses structured
 * output via --json-schema (reusing the same mechanism as the benchmark
 * checklist judge, but with a single-item schema).
 */

import {
  cliChatCompletion,
  type ModelConfig,
} from "../../benchmarks/lib/llm.ts";
import type { LLMMessage } from "../../benchmarks/lib/types.ts";

export interface JudgeInput {
  /** The rule being evaluated. */
  rule: string;
  /** The query that was sent to the agent. */
  userQuery: string;
  /** The agent's raw final output. */
  agentOutput: string;
}

export interface JudgeVerdict {
  pass: boolean;
  reason: string;
}

/**
 * Builds the message list for the judge LLM call.
 *
 * Exposed separately from the CLI call so unit tests can inspect the
 * prompt without hitting Claude.
 */
export function buildJudgeMessages(input: JudgeInput): LLMMessage[] {
  const system =
    `You are an impartial automated auditor for AI agent experiments.

Your job is to evaluate whether the agent's response satisfies a specific rule.
You are given three pieces of evidence:
1. The rule the agent was supposed to follow.
2. The original user query the agent received.
3. The agent's final response text.

Respond with a JSON object {"pass": boolean, "reason": string}.
- "pass" is true ONLY if the agent's final response clearly satisfies the rule.
- "reason" explains, in one sentence, what specific evidence supports your verdict.
- Do not use any tools. Base your judgment only on the text provided.`;

  const user = `<rule>
${input.rule}
</rule>

<user_query>
${input.userQuery}
</user_query>

<agent_output>
${input.agentOutput}
</agent_output>

Did the agent's final response satisfy the rule? Reply with JSON only.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Extracts {pass, reason} from a judge LLM response.
 * Tolerates text wrapping around a JSON object (defensive parsing).
 */
export function parseJudgeVerdict(raw: string): JudgeVerdict {
  // Find the first {...} JSON object in the text.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(`judge verdict not JSON: ${raw.slice(0, 200)}`);
  }
  const jsonStr = raw.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  if (typeof parsed.pass !== "boolean") {
    throw new Error(`judge verdict missing 'pass': ${jsonStr.slice(0, 200)}`);
  }
  const reason = typeof parsed.reason === "string" ? parsed.reason : "";
  return { pass: parsed.pass, reason };
}

const VERDICT_SCHEMA = {
  type: "object" as const,
  properties: {
    pass: { type: "boolean" as const },
    reason: { type: "string" as const },
  },
  required: ["pass", "reason"],
};

/**
 * Calls the judge LLM and returns a binary verdict.
 */
export async function judgeAdherence(
  input: JudgeInput,
  judgeConfig: ModelConfig,
): Promise<JudgeVerdict> {
  const messages = buildJudgeMessages(input);
  const configWithSchema: ModelConfig = {
    ...judgeConfig,
    jsonSchema: VERDICT_SCHEMA,
  };
  const response = await cliChatCompletion(messages, configWithSchema);
  return parseJudgeVerdict(response.content);
}
