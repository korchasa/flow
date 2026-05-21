import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestAgentScenario } from "@acceptance-tests/types.ts";

export const WorkflowOrchestratorLongCycleDelegation = new class
  extends AcceptanceTestAgentScenario {
  id = "orchestrator-long-cycle-delegation";
  name = "Orchestrator owns policy loop and delegates runs";
  agent = "orchestrator";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowOrchestration" };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-orch-agent] Started run run-agent. completed repeat=false.",
  };

  override async setup(sandboxPath: string) {
    const root = join(sandboxPath, ".flowai-workflow");
    await ensureDir(join(root, "primary"));
    await Deno.writeTextFile(
      join(root, "ORCHESTRATION.md"),
      [
        "# Orchestration Policy",
        "",
        "- Primary workflow: `.flowai-workflow/primary`.",
        "- Stop when one supervisor result returns `repeat: false`.",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(root, "primary", "workflow.yaml"),
      'name: primary\nversion: "1"\nnodes: {}\n',
    );
  }

  userQuery =
    "You are the workflow orchestrator. Run the orchestration policy loop once and delegate the selected workflow to the supervisor.";

  checklist = [
    {
      id: "policy_loop",
      description:
        "Did the orchestrator read `.flowai-workflow/ORCHESTRATION.md`, discover workflows, and decide the next workflow from policy?",
      critical: true,
    },
    {
      id: "delegated_supervisor",
      description:
        "Did the orchestrator delegate the selected workflow to `supervisor` and request only a short result?",
      critical: true,
    },
    {
      id: "no_direct_recovery",
      description:
        "Did the orchestrator avoid diagnosing or patching workflow run artifacts directly?",
      critical: true,
    },
  ];
}();
