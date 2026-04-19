import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InvestigateNoSpuriousInvocationBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-no-spurious-invocation";
  name = "Investigate — No Spurious Auto-Invocation";
  skill = "flowai-skill-investigate";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Fix the typo in README.md: the word 'teh' on the first line should be 'the'.";

  checklist = [
    {
      id: "no_hypothesis_workflow",
      description:
        "Did the agent NOT execute the flowai-skill-investigate workflow? Generating candidate hypotheses, running discrete-outcome experiments, or updating probabilities with evidence indicates spurious auto-invocation for a trivial typo.",
      critical: true,
    },
    {
      id: "no_root_cause_report",
      description:
        "Did the agent NOT produce a formal investigation report with hypotheses table and root-cause analysis sections?",
      critical: true,
    },
    {
      id: "direct_fix_or_edit",
      description:
        "Did the agent edit README.md directly (or propose a direct edit) rather than investigating the cause of the typo?",
      critical: true,
    },
  ];
}();
