import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: the user wants to plan, not implement. do requires a
// written Solution to execute against; "what should we do" is the planning
// phase.
export const DoTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "do-trigger-false-1";
  name = "what should we do (planning, not implement)";
  skill = "do";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We need dark mode for the dashboard. What approaches should we consider and which one fits best?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `do`? For this query the skill is not appropriate (the user is planning, not asking to execute an existing plan); the agent should either invoke a different skill (e.g. plan) or respond directly without reading `do/SKILL.md` or calling the `Skill` tool with `do`.",
    critical: true,
  }];
}();
