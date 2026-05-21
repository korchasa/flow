import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-orchestrate-trigger-false-1";
  name = "workflow engine concept question (false)";
  skill = "flowai-orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain what a DAG workflow engine is and how resume usually works conceptually.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-orchestrate`? The user asks a conceptual documentation question, not to run a local orchestration policy loop.",
    critical: true,
  }];
}();
