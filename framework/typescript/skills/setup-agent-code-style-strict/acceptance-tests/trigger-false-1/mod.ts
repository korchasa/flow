import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: meta question about strict mode itself, not a request to apply
// the skill to AGENTS.md.
export const TsStrictStyleTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "setup-agent-code-style-strict-trigger-false-1";
  name = "meta question about strict mode";
  skill = "setup-agent-code-style-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does TypeScript's `strict` flag actually turn on under the hood, and which sub-flags matter most in day-to-day code?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `setup-agent-code-style-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `setup-agent-code-style-strict/SKILL.md` or calling the `Skill` tool with `setup-agent-code-style-strict`.",
    critical: true,
  }];
}();
