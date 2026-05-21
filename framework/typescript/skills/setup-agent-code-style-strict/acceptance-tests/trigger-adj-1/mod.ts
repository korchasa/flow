import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: setup-agent-code-style-deno (the user's
// project is a Deno project, so the Deno-flavored variant is the correct match).
export const TsStrictStyleTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "setup-agent-code-style-strict-trigger-adj-1";
  name = "deno project (adjacent)";
  skill = "setup-agent-code-style-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "This is a Deno + TypeScript codebase. Capture the standard code-style rules in AGENTS.md so future sessions don't drift.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `setup-agent-code-style-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `setup-agent-code-style-strict/SKILL.md` or calling the `Skill` tool with `setup-agent-code-style-strict`.",
    critical: true,
  }];
}();
