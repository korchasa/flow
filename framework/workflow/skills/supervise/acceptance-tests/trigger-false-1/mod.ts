import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: a docs question about the engine's state.json schema. The
// user mentioned state.json but is not asking for a supervised run.
export const SuperviseTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "supervise-trigger-false-1";
  name = "docs question about state.json schema (wrong intent)";
  skill = "supervise";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  maxSteps = 2;
  stepTimeoutMs = 120_000;
  userQuery =
    "Conceptually, what is a workflow engine state file and how is it usually updated between nodes? Do not inspect local project files.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `supervise`? For this query the skill is not appropriate (the user wants schema documentation, not to run a workflow under supervision); the agent should either invoke a different skill or respond directly without reading `supervise/SKILL.md` or calling the `Skill` tool with `supervise`.",
    critical: true,
  }];
}();
