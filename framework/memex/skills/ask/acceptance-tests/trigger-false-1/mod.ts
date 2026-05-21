import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: question is a web/Stack Overflow lookup, not a memex query.
export const MemexAskTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "ask-trigger-false-1";
  name = "external web lookup";
  skill = "ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Search Stack Overflow and tell me the canonical way to debounce input in React with TypeScript.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `ask/SKILL.md` or calling the `Skill` tool with `ask`.",
    critical: true,
  }];
}();
