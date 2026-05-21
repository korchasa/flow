import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export const SuperviseTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "supervise-trigger-pos-1";
  name = "supervised run with fix-and-resume on failure";
  skill = "supervise";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  maxSteps = 5;
  stepTimeoutMs = 240_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-supervise-trigger] Started run run-trigger. completed.",
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
    "Run .flowai-workflow/github-inbox until it finishes. Check on it every 30 seconds; if a node fails, figure out why and fix it, then resume the same run.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `supervise` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `supervise`.",
    critical: true,
  }];
}();
