import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestratePrimaryBeforeMaintenance = new class
  extends AcceptanceTestScenario {
  id = "flowai-orchestrate-primary-before-maintenance";
  name = "Selects primary workflow before maintenance cadence";
  skill = "flowai-orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowOrchestration" };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-orch] Started run run-primary. completed repeat=false.",
  };

  override async setup(sandboxPath: string) {
    const root = join(sandboxPath, ".flowai-workflow");
    await ensureDir(join(root, "primary"));
    await ensureDir(join(root, "maintenance"));
    await Deno.writeTextFile(
      join(root, "ORCHESTRATION.md"),
      [
        "# Orchestration Policy",
        "",
        "- Primary workflow: `.flowai-workflow/primary`.",
        "- Maintenance workflow: `.flowai-workflow/maintenance` every 5th orchestration iteration.",
        "- Stop when the supervisor reports `status: completed` and `repeat: false`.",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(root, "primary", "workflow.yaml"),
      'name: primary\nversion: "1"\nnodes: {}\n',
    );
    await Deno.writeTextFile(
      join(root, "maintenance", "workflow.yaml"),
      'name: maintenance\nversion: "1"\nnodes: {}\n',
    );
    await Deno.writeTextFile(
      join(root, "orchestration.jsonl"),
      JSON.stringify({
        iteration: 1,
        workflow: ".flowai-workflow/primary",
        status: "completed",
      }) + "\n",
    );
  }

  userQuery =
    "Choose and run the next workflow from the local orchestration policy. Stop after the supervisor returns once.";

  checklist = [
    {
      id: "selected_primary",
      description:
        "Did the agent select `.flowai-workflow/primary` because the maintenance cadence has not reached the fifth iteration?",
      critical: true,
    },
    {
      id: "considered_available_workflows",
      description:
        "Did the agent inspect available `.flowai-workflow/<name>/workflow.yaml` files before delegating?",
      critical: true,
    },
  ];
}();
