import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DoTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-do-trigger-pos-1";
  name = "implement plan under TDD";
  skill = "flowai-do";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I already have a plan at documents/tasks/2026/05/add-trim.md. Implement its Solution under TDD — RED → GREEN → REFACTOR → CHECK.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-do` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-do`.",
    critical: true,
  }];
}();
