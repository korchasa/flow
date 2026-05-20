import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: GitHub Actions workflow setup — a different "workflow"
// product entirely, not flowai-workflow. flowai-scaffold must not activate.
export const ScaffoldTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-scaffold-trigger-adj-1";
  name = "set up a GitHub Actions workflow (adjacent)";
  skill = "flowai-scaffold";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up a GitHub Actions workflow that runs tests on every pull request and posts the results back as a comment.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-scaffold`? For this query the skill is not appropriate (the user wants a GitHub Actions CI workflow, not a flowai-workflow DAG); the agent should either invoke a different skill or respond directly without reading `flowai-scaffold/SKILL.md` or calling the `Skill` tool with `flowai-scaffold`.",
    critical: true,
  }];
}();
