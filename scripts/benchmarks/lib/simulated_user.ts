import { chatCompletion, ModelConfig } from "./llm.ts";
import { LLMMessage } from "./types.ts";

export interface SimulatedUserOptions {
  persona: string;
  config: ModelConfig;
  llmClient?: typeof chatCompletion;
}

export class SimulatedUser {
  private persona: string;
  private config: ModelConfig;
  private llm: typeof chatCompletion;

  constructor(options: SimulatedUserOptions) {
    this.persona = options.persona;
    this.config = options.config;
    this.llm = options.llmClient || chatCompletion;
  }

  /**
   * Decides if the agent is waiting for input and provides the response.
   * Returns null if no input is needed.
   */
  async getResponse(recentOutput: string): Promise<string | null> {
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `You are a simulated user in a CLI environment. 
Your persona: ${this.persona}

TASK:
1. Analyze the recent CLI output from an AI agent.
2. Determine if the agent is waiting for your input (e.g., asking a question, requesting confirmation, or showing a prompt like '?' or '>').
3. If the agent is NOT waiting for input, respond with "WAIT".
4. If the agent IS waiting for input, provide the response according to your persona.

RULES:
- Respond ONLY with the input string to send to the agent, or "WAIT".
- Do not include any explanations or quotes.
- If the agent asks a multiple-choice question, pick one based on your persona.
- If the agent asks for confirmation, say 'yes' or 'no' based on your persona.`,
      },
      {
        role: "user",
        content: `--- RECENT CLI OUTPUT ---\n${recentOutput}\n--- END OF OUTPUT ---`,
      },
    ];

    const response = await this.llm(messages, this.config);
    const content = response.content.trim();

    if (content === "WAIT") {
      return null;
    }

    return content;
  }
}
