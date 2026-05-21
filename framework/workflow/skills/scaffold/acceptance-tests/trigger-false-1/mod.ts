import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: a docs lookup about an existing workflow.yaml field. This is
// not a setup request, so scaffold should not activate.
export const ScaffoldTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "scaffold-trigger-false-1";
  name = "docs lookup on workflow.yaml field (wrong intent)";
  skill = "scaffold";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does flowai-workflow's `defaults.runtime` field do and which values are valid?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `scaffold`? For this query the skill is not appropriate (the user wants a documentation lookup about an existing field, not project scaffolding); the agent should either invoke a different skill or respond directly without reading `scaffold/SKILL.md` or calling the `Skill` tool with `scaffold`.",
    critical: true,
  }];
}();
