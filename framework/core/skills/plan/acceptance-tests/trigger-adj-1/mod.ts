import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: epic (multi-session, multi-phase work — uses a
// separate epic file with phase tracking, not a single-session task plan).
export const PlanTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "plan-trigger-adj-1";
  name = "multi-phase epic (adjacent)";
  skill = "plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We're going to migrate from Mongo to Postgres over the next two months. Lay it out as an epic with dependency-ordered phases.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `plan/SKILL.md` or calling the `Skill` tool with `plan`.",
    critical: true,
  }];
}();
