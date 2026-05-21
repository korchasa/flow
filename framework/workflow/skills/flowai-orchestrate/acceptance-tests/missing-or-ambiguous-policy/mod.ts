import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateMissingOrAmbiguousPolicy = new class
  extends AcceptanceTestScenario {
  id = "flowai-orchestrate-missing-or-ambiguous-policy";
  name = "Stops for clarification when orchestration policy is missing";
  skill = "flowai-orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "WorkflowOrchestration" };
  maxSteps = 5;
  stepTimeoutMs = 300_000;

  override async setup(sandboxPath: string) {
    const root = join(sandboxPath, ".flowai-workflow");
    await ensureDir(join(root, "alpha"));
    await ensureDir(join(root, "beta"));
    await Deno.writeTextFile(
      join(root, "alpha", "workflow.yaml"),
      'name: alpha\nversion: "1"\nnodes: {}\n',
    );
    await Deno.writeTextFile(
      join(root, "beta", "workflow.yaml"),
      'name: beta\nversion: "1"\nnodes: {}\n',
    );
  }

  userQuery =
    "Start orchestration for this repository. There are multiple workflows under .flowai-workflow.";

  checklist = [
    {
      id: "asked_for_policy",
      description:
        "Did the agent stop and ask the user to provide or clarify `.flowai-workflow/ORCHESTRATION.md` instead of guessing between workflows?",
      critical: true,
    },
    {
      id: "did_not_delegate",
      description:
        "Did the agent avoid launching a supervisor or running a workflow while the orchestration policy was missing or ambiguous?",
      critical: true,
    },
  ];
}();
