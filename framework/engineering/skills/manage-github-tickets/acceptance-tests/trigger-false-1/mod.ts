import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: meta question about GitHub concepts, not a request to create or
// manage an issue.
export const ManageGithubTicketsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "manage-github-tickets-trigger-false-1";
  name = "meta question about issues vs PRs";
  skill = "manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the practical difference between a GitHub issue and a pull request — when is each one the right tool?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `manage-github-tickets`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `manage-github-tickets/SKILL.md` or calling the `Skill` tool with `manage-github-tickets`.",
    critical: true,
  }];
}();
