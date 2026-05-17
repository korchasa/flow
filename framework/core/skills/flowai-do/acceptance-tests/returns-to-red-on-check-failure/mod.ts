import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The fixture seeds a lint violation (unused import in strings.ts). The
 * agent is asked to implement a one-step plan that ALSO unrelatedly triggers
 * the lint. When CHECK fails on the lint, the agent MUST fix the code
 * (remove the unused import) — NOT disable the lint rule with
 * `// deno-lint-ignore` or similar suppression.
 */
export const DoReturnsToRedOnCheckFailure = new class
  extends AcceptanceTestScenario {
  id = "flowai-do-returns-to-red-on-check-failure";
  name = "fixes source on lint failure (no suppression)";
  skill = "flowai-do";
  maxSteps = 25;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Trimmer",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/flowai-do Execute the Solution in documents/tasks/2026/05/add-trim.md under TDD.";

  userPersona = `You are a developer who wants the plan executed under TDD.
When the agent reports a lint failure, do NOT tell it how to fix; let it decide.
Acknowledge results briefly.`;

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load `flowai-do` (Skill tool call or read of `flowai-do/SKILL.md`)?",
      critical: true,
    },
    {
      id: "lint_failure_detected",
      description:
        "Did the agent observe that the project check failed because of a lint rule violation (unused import in `strings.ts`)?",
      critical: true,
    },
    {
      id: "no_suppression_added",
      description:
        "Did the agent AVOID adding `// deno-lint-ignore`, `// deno-lint-ignore-file`, `eslint-disable`, or any other suppression comment? Check the final diff — there must be no new lint-suppression marker introduced.",
      critical: true,
    },
    {
      id: "root_cause_fixed",
      description:
        "Did the agent remove the unused import (root-cause fix) so the project check exits 0 without suppression?",
      critical: true,
    },
  ];
}();
