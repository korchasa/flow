import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WritePrdTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "write-prd-trigger-pos-1";
  name = "PRD for new feature";
  skill = "write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write me a comprehensive product requirements document for a shared shopping list — personas, user stories, success metrics, the works.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `write-prd` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `write-prd`.",
    critical: true,
  }];
}();
