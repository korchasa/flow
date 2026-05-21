import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SuperviseDelegatesSupervisor = new class
  extends AcceptanceTestScenario {
  id = "flowai-supervise-delegates-supervisor";
  name = "Public supervise skill delegates one run to supervisor agent";
  skill = "flowai-supervise";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowTarget" };
  maxSteps = 6;
  stepTimeoutMs = 300_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-supervise] Started run run-supervised. completed.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "primary");
    await ensureDir(workflowDir);
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      'name: primary\nversion: "1"\nnodes: {}\n',
    );
  }

  userQuery =
    "Supervise .flowai-workflow/primary until it reaches a terminal state. Use a dedicated supervisor agent for the run.";

  checklist = [
    {
      id: "delegated_single_run",
      description:
        "Did the agent delegate exactly one workflow/run to `flowai-workflow-supervisor` instead of doing the full diagnosis loop in the parent context?",
      critical: true,
    },
    {
      id: "preserved_single_run_contract",
      description:
        "Did the delegation ask the supervisor to start or resume only `.flowai-workflow/primary` and return a concise stop report?",
      critical: true,
    },
  ];
}();
