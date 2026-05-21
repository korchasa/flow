import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const TsStrictStyleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "setup-agent-code-style-strict-trigger-pos-1";
  name = "add strict TS rules to AGENTS.md";
  skill = "setup-agent-code-style-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We run TypeScript with `strict: true` on Node. Add the strict-mode code-style rules to AGENTS.md so the assistant follows them.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `setup-agent-code-style-strict` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `setup-agent-code-style-strict`.",
    critical: true,
  }];
}();
