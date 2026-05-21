import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SuperviseRunFailResume = new class extends AcceptanceTestScenario {
  id = "supervise-run-fail-resume";
  name = "Diagnoses a failed run, patches artifacts, then resumes once";
  skill = "supervise";
  agentsTemplateVars = {
    PROJECT_NAME: "WorkflowTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS: "- Check: `deno task check`",
  };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-wfsup] Started run run-fail. Existing state.json records verify as failed; resume accepts --resume run-fail.",
  };

  override sandboxState = {
    commits: [],
    modified: [
      ".flowai-workflow/github-inbox/workflow.yaml",
      ".flowai-workflow/github-inbox/agents/agent-verify.md",
    ],
    expectedOutcome:
      "Agent reads failed run artifacts, applies a targeted fix, attempts `flowai-workflow run ... --resume run-fail`, and stops after one recovery iteration.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "github-inbox");
    const runDir = join(workflowDir, "runs", "run-fail");
    await ensureDir(join(workflowDir, "agents"));
    await ensureDir(join(runDir, "verify"));
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        "name: github-inbox",
        'version: "1"',
        "defaults:",
        "  runtime: claude",
        "nodes:",
        "  verify:",
        "    type: agent",
        "    label: Verify",
        "    prompt: Run tests and write report.md.",
        "    validate:",
        "      - type: contains_section",
        "        path: report.md",
        "        value: Verification",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "agents", "agent-verify.md"),
      [
        "# Verify Agent",
        "",
        "Run `deno test` and summarize output.",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(runDir, "state.json"),
      JSON.stringify(
        {
          run_id: "run-fail",
          status: "failed",
          current_node: "verify",
          nodes: {
            verify: {
              status: "failed",
              error:
                "Validation failed: report.md missing required section Verification",
            },
          },
        },
        null,
        2,
      ) + "\n",
    );
    await Deno.writeTextFile(
      join(runDir, "verify", "report.md"),
      [
        "# Test Report",
        "",
        "Tests passed, but the required Verification heading is missing.",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "Supervise one recovery iteration for .flowai-workflow/github-inbox. The existing run id is run-fail. Inspect the failed verify node, patch the workflow or agent prompt, run the same workflow with --resume run-fail, then stop with a short report.";

  checklist = [
    {
      id: "resumed_workflow_command",
      description:
        "Did the agent attempt to run `flowai-workflow run .flowai-workflow/github-inbox --resume run-fail` or an equivalent same-run resume command?",
      critical: true,
    },
    {
      id: "read_failed_state",
      description:
        "Did the agent read `.flowai-workflow/github-inbox/runs/run-fail/state.json` or otherwise inspect the failed run state before applying a fix?",
      critical: true,
    },
    {
      id: "inspected_artifact",
      description:
        "Did the agent inspect the failed node artifact under `.flowai-workflow/github-inbox/runs/run-fail/verify/` to diagnose the validation failure?",
      critical: true,
    },
    {
      id: "resumed_same_run",
      description:
        "After applying a targeted fix, did the agent attempt to resume the same run with `--resume run-fail` rather than starting a fresh run?",
      critical: true,
    },
  ];
}();
