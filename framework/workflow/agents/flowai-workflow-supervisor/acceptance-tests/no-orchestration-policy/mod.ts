import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestAgentScenario } from "@acceptance-tests/types.ts";

export const WorkflowSupervisorNoOrchestrationPolicy = new class
  extends AcceptanceTestAgentScenario {
  id = "flowai-workflow-supervisor-no-orchestration-policy";
  name = "Supervisor ignores orchestration policy";
  agent = "flowai-workflow-supervisor";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowTarget" };
  maxSteps = 6;
  stepTimeoutMs = 300_000;

  override async setup(sandboxPath: string) {
    const root = join(sandboxPath, ".flowai-workflow");
    await ensureDir(join(root, "primary"));
    await ensureDir(join(root, "maintenance"));
    await Deno.writeTextFile(
      join(root, "ORCHESTRATION.md"),
      "# Policy\n\n- Maintenance workflow: `.flowai-workflow/maintenance`.\n",
    );
    await Deno.writeTextFile(
      join(root, "primary", "workflow.yaml"),
      'name: primary\nversion: "1"\nnodes: {}\n',
    );
    await Deno.writeTextFile(
      join(root, "maintenance", "workflow.yaml"),
      'name: maintenance\nversion: "1"\nnodes: {}\n',
    );
  }

  userQuery =
    "You are the workflow supervisor. Supervise only .flowai-workflow/primary. Do not choose the next workflow.";

  checklist = [
    {
      id: "did_not_interpret_policy",
      description:
        "Did the supervisor avoid interpreting `.flowai-workflow/ORCHESTRATION.md` or selecting `.flowai-workflow/maintenance`?",
      critical: true,
    },
    {
      id: "stayed_single_workflow",
      description:
        "Did the supervisor stay scoped to the requested `.flowai-workflow/primary` workflow?",
      critical: true,
    },
  ];
}();
