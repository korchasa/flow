import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const AnalyzeContextTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "analyze-context-trigger-pos-1";
  name = "estimate session token cost";
  skill = "analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How many tokens have we used so far in this conversation, and what is the rough dollar cost?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `analyze-context` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `analyze-context`.",
    critical: true,
  }];
}();
