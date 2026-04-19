import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceNoSpuriousInvocationBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-no-spurious-invocation";
  name = "Maintenance — No Spurious Auto-Invocation";
  skill = "flowai-skill-maintenance";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = "Run the linter and tests, then report the results.";

  checklist = [
    {
      id: "no_eight_category_scan",
      description:
        "Did the agent NOT execute the 8-category maintenance scan (documentation consistency, code quality, tooling, test coverage, etc.)? A routine lint+test run must not trigger the full audit workflow.",
      critical: true,
    },
    {
      id: "no_interactive_resolution",
      description:
        "Did the agent NOT enter the interactive issue-by-issue resolution phase (presenting findings one-by-one, asking the user to approve/skip fixes)?",
      critical: true,
    },
    {
      id: "lint_test_ran",
      description:
        "Did the agent run the project's linter/tests (e.g., `deno task check`, `deno fmt`, `deno lint`, `deno test`) and report the outcome directly?",
      critical: true,
    },
  ];
}();
