import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WriteAgentBenchmarksTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "write-agent-benchmarks-trigger-pos-1";
  name = "new test scenario request";
  skill = "write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I just shipped a new commit-message workflow and want a measurable scenario that proves it produces a clean conventional commit. Help me write one.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `write-agent-benchmarks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `write-agent-benchmarks`.",
    critical: true,
  }];
}();
