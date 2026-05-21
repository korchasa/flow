import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: setup-agent-code-style-strict (the user is on
// a Node + tsc strict project, not Deno).
export const TsDenoStyleTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "setup-agent-code-style-deno-trigger-adj-1";
  name = "strict TS project (adjacent)";
  skill = "setup-agent-code-style-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We have a Node.js TypeScript service with `strict: true` in tsconfig. Add code-style rules to AGENTS.md so the assistant respects strict-mode conventions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `setup-agent-code-style-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `setup-agent-code-style-deno/SKILL.md` or calling the `Skill` tool with `setup-agent-code-style-deno`.",
    critical: true,
  }];
}();
