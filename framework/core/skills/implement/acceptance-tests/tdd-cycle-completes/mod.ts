import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * `implement` executes a one-step plan under TDD. The fixture contains a plan
 * file (`documents/tasks/2026/05/add-trim.md`) whose Solution asks for a
 * `trim` function in `strings.ts`. The agent must follow RED → GREEN →
 * REFACTOR → CHECK observable in the trace, not jump straight to writing the
 * implementation.
 */
export const ImplementTddCycleCompletes = new class
  extends AcceptanceTestScenario {
  id = "implement-tdd-cycle-completes";
  name = "TDD cycle observable in trace";
  skill = "implement";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Trimmer",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/implement Execute the Solution in documents/tasks/2026/05/add-trim.md under TDD.";

  userPersona =
    `You are a developer who has already written a plan and now wants the agent to implement it under TDD.
When the agent asks questions or proposes a plan, confirm and let it proceed.
When shown test results, acknowledge them. Keep answers brief and affirmative.`;

  checklist = [
    {
      id: "plan_re_read",
      description:
        "Did the agent re-read the plan file `documents/tasks/2026/05/add-trim.md` from disk before implementing?",
      critical: true,
    },
    {
      id: "red_observable",
      description:
        "Is there a RED step observable in the trace — a failing test written and run BEFORE the implementation (test fails with a message that points at missing functionality)?",
      critical: true,
    },
    {
      id: "green_observable",
      description:
        "Is there a GREEN step — the implementation written AFTER RED, then the test re-run and passing?",
      critical: true,
    },
    {
      id: "check_observable",
      description:
        "Did the agent run the project check (`deno task check` or equivalent) at least once after GREEN, and did it pass?",
      critical: true,
    },
  ];
}();
