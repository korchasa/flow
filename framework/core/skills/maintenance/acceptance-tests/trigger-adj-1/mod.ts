import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review (review of CURRENT uncommitted diff,
// not a broad project-wide audit).
export const MaintenanceTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "maintenance-trigger-adj-1";
  name = "review my staged diff (adjacent)";
  skill = "maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I have a staged diff ready to commit. Review it as QA + lead engineer and tell me if I'm missing anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `maintenance/SKILL.md` or calling the `Skill` tool with `maintenance`.",
    critical: true,
  }];
}();
