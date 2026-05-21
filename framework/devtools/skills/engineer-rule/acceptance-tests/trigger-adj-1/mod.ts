import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: setup-agent-code-style-deno (Deno-specific
// code-style scaffold, not a general rule-authoring task).
export const EngineerRuleTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-rule-trigger-adj-1";
  name = "deno code-style scaffold (adjacent)";
  skill = "engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up the standard Deno + TypeScript code-style guidelines in this project so the agent knows our linting and formatting conventions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-rule/SKILL.md` or calling the `Skill` tool with `engineer-rule`.",
    critical: true,
  }];
}();
