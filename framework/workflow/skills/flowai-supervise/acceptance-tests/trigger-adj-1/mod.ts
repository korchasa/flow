import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-investigate handles post-mortem root-cause
// analysis of an already-finished failing run; flowai-supervise is for
// supervising a live run.
export const SuperviseTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-supervise-trigger-adj-1";
  name = "post-mortem of a finished failing run (adjacent)";
  skill = "flowai-supervise";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Last night's flowai-workflow run failed at the verify node and is sitting in `runs/20260518T0211/`. Diagnose what went wrong and recommend a fix.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-supervise`? For this query the skill is not appropriate (the run has already finished — this is a post-mortem investigation, which is `flowai-investigate`'s job, not live-run supervision); the agent should either invoke a different skill or respond directly without reading `flowai-supervise/SKILL.md` or calling the `Skill` tool with `flowai-supervise`.",
    critical: true,
  }];
}();
