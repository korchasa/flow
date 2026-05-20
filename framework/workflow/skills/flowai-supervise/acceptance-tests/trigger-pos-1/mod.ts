import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SuperviseTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-supervise-trigger-pos-1";
  name = "supervised run with fix-and-resume on failure";
  skill = "flowai-supervise";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run .flowai-workflow/github-inbox until it finishes. Check on it every 30 seconds; if a node fails, figure out why and fix it, then resume the same run.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-supervise` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-supervise`.",
    critical: true,
  }];
}();
