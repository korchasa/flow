import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestAgentScenario } from "@acceptance-tests/types.ts";

export const WorkflowSupervisorFailedRunResume = new class
  extends AcceptanceTestAgentScenario {
  id = "flowai-workflow-supervisor-failed-run-resume";
  name = "Supervisor diagnoses failed run and resumes same run";
  agent = "flowai-workflow-supervisor";
  agentsTemplateVars = {
    PROJECT_NAME: "WorkflowTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-supervisor] resume accepted for run-failed; same run continues.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "primary");
    const runDir = join(workflowDir, "runs", "run-failed");
    await ensureDir(join(workflowDir, "agents"));
    await ensureDir(join(runDir, "qa", "verify"));
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        "name: primary",
        'version: "1"',
        "phases:",
        "  qa: [verify]",
        "nodes:",
        "  verify:",
        "    type: agent",
        "    system_prompt: '{{file(\".flowai-workflow/primary/agents/agent-verify.md\")}}'",
        "    prompt: Write {{node_dir}}/report.md.",
        "    validate:",
        "      - type: contains_section",
        "        path: '{{node_dir}}/report.md'",
        "        value: Evidence",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "agents", "agent-verify.md"),
      "# Verify Agent\n\nWrite report.md with a result summary.\n",
    );
    await Deno.writeTextFile(
      join(runDir, "state.json"),
      JSON.stringify(
        {
          run_id: "run-failed",
          status: "failed",
          current_node: "verify",
          nodes: {
            verify: {
              status: "failed",
              error: "Validation failed: report.md missing section Evidence",
            },
          },
        },
        null,
        2,
      ) + "\n",
    );
    await Deno.writeTextFile(
      join(runDir, "journal.jsonl"),
      JSON.stringify({
        kind: "node_directory_declared",
        run_id: "run-failed",
        node_id: "verify",
        node_dir: ".flowai-workflow/primary/runs/run-failed/qa/verify",
      }) + "\n",
    );
    await Deno.writeTextFile(
      join(runDir, "qa", "verify", "report.md"),
      "# Verification\n\nThe Evidence section is missing.\n",
    );
  }

  userQuery =
    "You are the workflow supervisor. Handle one workflow only: .flowai-workflow/primary with run id run-failed. Diagnose the failure, patch the root cause, resume the same run once, and stop with a concise report.";

  checklist = [
    {
      id: "inspected_run_artifacts",
      description:
        "Did the supervisor inspect `state.json`, `journal.jsonl`, and the failed node artifact before patching?",
      critical: true,
    },
    {
      id: "patched_root_cause",
      description:
        "Did the supervisor patch a root-cause surface such as workflow config or the node agent prompt rather than editing `state.json`?",
      critical: true,
    },
    {
      id: "resumed_same_run",
      description:
        "Did the supervisor run `flowai-workflow run .flowai-workflow/primary --resume run-failed` or an equivalent same-run resume command?",
      critical: true,
    },
  ];
}();
