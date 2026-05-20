import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: a docs lookup about an existing workflow.yaml field. This is
// not a setup request, so flowai-scaffold should not activate.
export const ScaffoldTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-scaffold-trigger-false-1";
  name = "docs lookup on workflow.yaml field (wrong intent)";
  skill = "flowai-scaffold";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does flowai-workflow's `defaults.runtime` field do and which values are valid?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-scaffold`? For this query the skill is not appropriate (the user wants a documentation lookup about an existing field, not project scaffolding); the agent should either invoke a different skill or respond directly without reading `flowai-scaffold/SKILL.md` or calling the `Skill` tool with `flowai-scaffold`.",
    critical: true,
  }];
}();
