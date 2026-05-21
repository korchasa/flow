import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: save — user is providing a source to persist
// into the memex, not asking a question against it.
export const MemexAskTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "ask-trigger-adj-1";
  name = "save-to-memex query (adjacent)";
  skill = "ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Here's the architect's RFC link — please file it into our knowledge bank and cross-link it to the existing auth pages.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `ask/SKILL.md` or calling the `Skill` tool with `ask`.",
    critical: true,
  }];
}();
