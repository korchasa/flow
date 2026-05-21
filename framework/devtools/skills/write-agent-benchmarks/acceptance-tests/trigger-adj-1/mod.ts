import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: engineer-skill (authoring the SKILL.md itself,
// not writing benchmarks for an existing one).
export const WriteAgentBenchmarksTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "write-agent-benchmarks-trigger-adj-1";
  name = "author a new skill (adjacent)";
  skill = "write-agent-benchmarks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to package my migration-review workflow as a reusable capability the agent can auto-discover. Help me structure it from scratch.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `write-agent-benchmarks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `write-agent-benchmarks/SKILL.md` or calling the `Skill` tool with `write-agent-benchmarks`.",
    critical: true,
  }];
}();
