import type { LLMMessage, LLMResponse } from "./types.ts";
import { load } from "@std/dotenv";

export interface ModelConfig {
  model: string;
  temperature: number;
  jsonSchema?: Record<string, unknown>;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: "allow" | "deny";
  };
  [key: string]: unknown;
}

export interface IdeConfig {
  agent_models: string[];
  default_agent_model: string;
  judge: ModelConfig;
}

export interface BenchmarkConfig {
  default_ides: string[];
  ides: Record<string, IdeConfig>;
}

/** Get IDE-specific config */
export function getIdeConfig(
  config: BenchmarkConfig,
  ide: string,
): IdeConfig {
  const ideSection = config.ides[ide];
  if (!ideSection) {
    throw new Error(
      `No configuration found for IDE "${ide}". Available: ${
        Object.keys(config.ides).join(", ")
      }`,
    );
  }
  return ideSection;
}

export async function loadConfig(
  path = "benchmarks/config.json",
): Promise<BenchmarkConfig> {
  try {
    const content = await Deno.readTextFile(path);
    const config = JSON.parse(content) as BenchmarkConfig;
    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Configuration file not found at ${path}. Please create it to run benchmarks.`,
      );
    }
    throw e;
  }
}

export async function chatCompletion(
  messages: LLMMessage[],
  configOrModel: ModelConfig | string,
  temperature?: number,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  // Load .env if present
  try {
    await load({ export: true });
  } catch (_) {
    // Ignore if .env is missing or fails to load
  }

  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

  if (!OPENROUTER_API_KEY) {
    console.warn(
      "WARNING: OPENROUTER_API_KEY is not set. LLM calls will fail.",
    );
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const config: ModelConfig = typeof configOrModel === "string"
    ? { model: configOrModel, temperature: temperature ?? 0 }
    : { ...configOrModel };

  // If temperature was passed explicitly, override the one in config
  if (temperature !== undefined) {
    config.temperature = temperature;
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cursor.sh", // Optional, for OpenRouter rankings
        "X-Title": "Cursor IDE Rules Benchmark", // Optional
      },
      body: JSON.stringify({
        messages,
        ...config,
      }),
      signal,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenRouter API error: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

interface ClaudeCliEvent {
  type?: string;
  result?: string;
  structured_output?: Record<string, unknown>;
  total_cost_usd?: number;
  usage?: Record<string, unknown>;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
}

/** Chat completion via Claude CLI (`claude -p`). No API key needed — uses existing CLI auth. */
export async function cliChatCompletion(
  messages: LLMMessage[],
  configOrModel: ModelConfig | string,
  _temperature?: number,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const config: ModelConfig = typeof configOrModel === "string"
    ? { model: configOrModel, temperature: 0 }
    : { ...configOrModel };

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const userMsg = messages.filter((m) => m.role !== "system")
    .map((m) => m.content).join("\n\n");

  const args = [
    "-p",
    "--model",
    config.model,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--verbose",
  ];

  if (systemMsg) {
    args.push("--system-prompt", systemMsg);
  }

  if (config.jsonSchema) {
    args.push("--json-schema", JSON.stringify(config.jsonSchema));
  }

  args.push(userMsg);

  const cmd = new Deno.Command("claude", {
    args,
    env: { ...Deno.env.toObject(), CLAUDECODE: "" },
    signal,
  });

  const output = await cmd.output();
  const stdout = new TextDecoder().decode(output.stdout);

  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(
      `Claude CLI failed (exit ${output.code}): ${stderr}`,
    );
  }

  const events = JSON.parse(stdout) as ClaudeCliEvent[];
  const resultEvent = events.find((e) => e.type === "result");

  if (!resultEvent) {
    throw new Error("Claude CLI: no result event in output");
  }

  // With --json-schema: structured_output contains validated JSON
  if (config.jsonSchema && resultEvent.structured_output) {
    return {
      content: JSON.stringify(resultEvent.structured_output),
      usage: undefined,
    };
  }

  // Without --json-schema: extract text from last assistant event
  const assistantEvents = events.filter((e) => e.type === "assistant");
  const lastAssistant = assistantEvents[assistantEvents.length - 1];
  const contentBlocks = lastAssistant?.message?.content;
  const text = contentBlocks?.find((b) => b.type === "text")?.text ?? "";

  return { content: text, usage: undefined };
}
