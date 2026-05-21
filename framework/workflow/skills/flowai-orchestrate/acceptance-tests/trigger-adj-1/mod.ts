import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export const OrchestrateTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-orchestrate-trigger-adj-1";
  name = "single supervised workflow run (adjacent)";
  skill = "flowai-orchestrate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  maxSteps = 4;
  stepTimeoutMs = 240_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-adj] Started run run-adj. completed repeat=false.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "github-inbox");
    await ensureDir(workflowDir);
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      'name: github-inbox\nversion: "1"\nnodes: {}\n',
    );
  }

  userQuery =
    "Supervise .flowai-workflow/github-inbox until this one run finishes; if it fails, diagnose and resume the same run.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-orchestrate`? This query asks for one supervised run, which belongs to `flowai-supervise`, not orchestration policy selection.",
    critical: true,
  }];
}();
