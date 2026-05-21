import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateMaintenanceCadence = new class
  extends AcceptanceTestScenario {
  id = "orchestrate-maintenance-cadence";
  name = "Selects maintenance workflow on every fifth orchestration";
  skill = "orchestrate";
  agentsTemplateVars = {
    PROJECT_NAME: "WorkflowOrchestration",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-orch] Started run run-orchestrated. completed repeat=false.",
  };

  override sandboxState = {
    commits: [],
    modified: [".flowai-workflow/orchestration.jsonl"],
    expectedOutcome:
      "Agent reads ORCHESTRATION.md and orchestration.jsonl, selects maintenance for iteration 5, appends a decision, and delegates the run to the supervisor.",
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
        "- Stop when a selected supervisor report says `repeat: false`.",
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
    const history = [1, 2, 3, 4].map((iteration) =>
      JSON.stringify({
        iteration,
        workflow: ".flowai-workflow/primary",
        status: "completed",
      })
    ).join("\n") + "\n";
    await Deno.writeTextFile(join(root, "orchestration.jsonl"), history);
  }

  userQuery =
    "Continue the flowai-workflow orchestration loop for one decision. Follow .flowai-workflow/ORCHESTRATION.md and the JSONL history. Stop after the supervisor returns once.";

  checklist = [
    {
      id: "selected_maintenance",
      description:
        "Did the agent select `.flowai-workflow/maintenance` because four prior orchestration records make the next decision the fifth iteration?",
      critical: true,
    },
    {
      id: "read_policy_and_history",
      description:
        "Did the agent read both `.flowai-workflow/ORCHESTRATION.md` and `.flowai-workflow/orchestration.jsonl` before choosing?",
      critical: true,
    },
    {
      id: "append_only_history",
      description:
        "Did the agent append a new decision record to `.flowai-workflow/orchestration.jsonl` instead of rewriting or replacing the history?",
      critical: true,
    },
  ];
}();
