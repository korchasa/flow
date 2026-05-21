import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateDelegatesSupervisor = new class
  extends AcceptanceTestScenario {
  id = "orchestrate-delegates-supervisor";
  name =
    "Delegates selected workflow to supervisor without reading run artifacts";
  skill = "orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowOrchestration" };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-orch] Started run run-delegated. completed repeat=false.",
  };

  override async setup(sandboxPath: string) {
    const root = join(sandboxPath, ".flowai-workflow");
    const workflowDir = join(root, "primary");
    await ensureDir(join(workflowDir, "runs", "run-deep", "logs"));
    await Deno.writeTextFile(
      join(root, "ORCHESTRATION.md"),
      [
        "# Orchestration Policy",
        "",
        "- Primary workflow: `.flowai-workflow/primary`.",
        "- Stop after one supervisor result for this benchmark.",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      'name: primary\nversion: "1"\nnodes: {}\n',
    );
    await Deno.writeTextFile(
      join(workflowDir, "runs", "run-deep", "state.json"),
      JSON.stringify({ run_id: "run-deep", status: "failed" }) + "\n",
    );
    await Deno.writeTextFile(
      join(workflowDir, "runs", "run-deep", "logs", "node.json"),
      JSON.stringify({ secret_for_test: "orchestrator must not inspect" }) +
        "\n",
    );
  }

  userQuery =
    "Run one orchestration iteration. The selected workflow may already have run artifacts, but orchestration should stay at policy level. Stop after the supervisor returns once.";

  checklist = [
    {
      id: "delegated_to_supervisor",
      description:
        "Did the agent launch or explicitly delegate to `supervisor` for the selected `.flowai-workflow/primary` workflow?",
      critical: true,
    },
    {
      id: "did_not_read_deep_artifacts",
      description:
        "Before the `supervisor` subagent was invoked, did the parent/orchestrator avoid reading deep run artifacts such as `runs/run-deep/state.json` or `runs/run-deep/logs/node.json`? Reads inside the supervisor subagent are allowed.",
      critical: true,
    },
    {
      id: "requested_short_summary",
      description:
        "Did the delegation request only a short supervisor result with workflow, run id, status, fixes, and repeat recommendation?",
      critical: true,
    },
  ];
}();
