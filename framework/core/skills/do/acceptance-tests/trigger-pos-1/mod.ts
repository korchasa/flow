import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DoTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "do-trigger-pos-1";
  name = "implement plan under TDD";
  skill = "do";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I already have a plan at documents/tasks/2026/05/add-trim.md. Implement its Solution under TDD — RED → GREEN → REFACTOR → CHECK.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `do` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `do`.",
    critical: true,
  }];
}();
