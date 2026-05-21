import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: routine lint/test command, explicitly excluded by the
// description ("Do NOT trigger on routine lint/test runs").
export const MaintenanceTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "maintenance-trigger-false-1";
  name = "routine lint/test run";
  skill = "maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Just run lint and tests for me and report whether everything is green.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `maintenance/SKILL.md` or calling the `Skill` tool with `maintenance`.",
    critical: true,
  }];
}();
