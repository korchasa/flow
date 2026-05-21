import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-orchestrate-trigger-pos-1";
  name = "workflow orchestration loop (positive)";
  skill = "flowai-orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Continue the workflow orchestration loop from .flowai-workflow/ORCHESTRATION.md and run the next selected workflow.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-orchestrate` in response to this query? Look for a Skill tool call or a read of `flowai-orchestrate/SKILL.md`.",
    critical: true,
  }];
}();
