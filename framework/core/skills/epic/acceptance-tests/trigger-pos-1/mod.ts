import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EpicTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "epic-trigger-pos-1";
  name = "multi-phase feature plan";
  skill = "epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need to plan a multi-month migration from REST to gRPC across 4 services. Break it into phases with dependencies and per-phase status tracking.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `epic` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `epic`.",
    critical: true,
  }];
}();
