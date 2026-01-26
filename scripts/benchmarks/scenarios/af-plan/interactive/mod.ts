import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

export const PlanInteractiveBench: BenchmarkScenario = {
  id: "af-plan-interactive",
  name: "Plan with Interactive Variant Selection",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // documents/ directory is now in fixture/
  },

  userQuery: "Plan a simple CLI tool that prints 'Hello World'.",

  userReplies: ["I prefer Variant 1 (Deno native)."],

  checklist: [
    {
      id: "variants_presented",
      description: "Did the agent present implementation variants in the chat?",
      critical: true,
      type: "semantic",
    },
    {
      id: "solution_filled",
      description:
        "Is the 'Solution' section in 'documents/whiteboard.md' filled (not empty)?",
      critical: true,
    },
    {
      id: "todo_used",
      description: "Did the logs contain 'todo_write'?",
      critical: false,
      type: "static",
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
      type: "static",
    },
  ],
};
