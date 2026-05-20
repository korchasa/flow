import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ScaffoldTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-scaffold-trigger-pos-1";
  name = "scaffold flowai-workflow into a project";
  skill = "flowai-scaffold";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a flowai-workflow pipeline to this repo that triages GitHub issues. Scaffold the directory and wire up the agents.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-scaffold` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-scaffold`.",
    critical: true,
  }];
}();
