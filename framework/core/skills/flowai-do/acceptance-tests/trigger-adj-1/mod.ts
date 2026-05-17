import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-fix-tests (repair pre-existing failing tests, no
// plan involved). flowai-do explicitly excludes this case in its description.
export const DoTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-do-trigger-adj-1";
  name = "fix existing failing tests (adjacent)";
  skill = "flowai-do";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Three tests have been failing on main for a week. Track down the root cause and fix them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-do`? For this query the skill is not appropriate (no plan, generic test fixing); the agent should either invoke a different skill or respond directly without reading `flowai-do/SKILL.md` or calling the `Skill` tool with `flowai-do`.",
    critical: true,
  }];
}();
