import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: deploy (cloud deploy and deployctl,
// not local CLI invocation).
export const DenoCliTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "cli-trigger-adj-1";
  name = "deploy to deno deploy (adjacent)";
  skill = "cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Push this app to the cloud so I can give my team a preview URL. We're already on Deno's hosting platform.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `cli/SKILL.md` or calling the `Skill` tool with `cli`.",
    critical: true,
  }];
}();
