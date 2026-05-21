import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SuperviseCustomArtifactDiagnostics = new class
  extends AcceptanceTestScenario {
  id = "flowai-supervise-custom-artifact-diagnostics";
  name =
    "Diagnoses custom node and artifact names without hardcoded workflow assumptions";
  skill = "flowai-supervise";
  agentsTemplateVars = {
    PROJECT_NAME: "WorkflowTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS: "- Check: `deno task check`",
  };
  maxSteps = 8;
  stepTimeoutMs = 360_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-wf-custom] resume accepted for run-custom; custom smoke-check node will retry.",
  };

  override sandboxState = {
    commits: [],
    modified: [
      ".flowai-workflow/prod-watch/workflow.yaml",
      ".flowai-workflow/prod-watch/agents/agent-smoke.md",
    ],
    expectedOutcome:
      "Agent derives custom node/artifact names from workflow.yaml and run state, inspects health-summary.md, and resumes run-custom.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "prod-watch");
    const runDir = join(workflowDir, "runs", "run-custom");
    await ensureDir(join(workflowDir, "agents"));
    await ensureDir(join(runDir, "audit", "smoke-check"));
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        'name: "prod-watch"',
        'version: "1"',
        "phases:",
        "  audit: [smoke-check]",
        "nodes:",
        "  smoke-check:",
        "    type: agent",
        "    label: Smoke Check",
        "    system_prompt: '{{file(\".flowai-workflow/prod-watch/agents/agent-smoke.md\")}}'",
        "    prompt: Write {{node_dir}}/health-summary.md.",
        "    validate:",
        "      - type: artifact",
        "        path: '{{node_dir}}/health-summary.md'",
        "        sections: [Summary, Probe Results, Verdict]",
        "      - type: frontmatter_field",
        "        path: '{{node_dir}}/health-summary.md'",
        "        field: status",
        "        allowed: [healthy, degraded]",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "agents", "agent-smoke.md"),
      "# Smoke Agent\n\nWrite health-summary.md with required frontmatter.\n",
    );
    await Deno.writeTextFile(
      join(runDir, "state.json"),
      JSON.stringify(
        {
          run_id: "run-custom",
          status: "failed",
          current_node: "smoke-check",
          nodes: {
            "smoke-check": {
              status: "failed",
              error:
                "Validation failed: health-summary.md missing frontmatter field status",
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
        run_id: "run-custom",
        node_id: "smoke-check",
        node_dir:
          ".flowai-workflow/prod-watch/runs/run-custom/audit/smoke-check",
      }) + "\n",
    );
    await Deno.writeTextFile(
      join(runDir, "audit", "smoke-check", "health-summary.md"),
      [
        "# Summary",
        "",
        "The probe ran but omitted required frontmatter.",
        "",
        "## Probe Results",
        "",
        "- HTTP 200",
        "",
        "## Verdict",
        "",
        "Degraded until frontmatter is added.",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "Supervise .flowai-workflow/prod-watch run run-custom. Diagnose the failed custom smoke-check node and resume the same run once. This workflow does not use PDR files or a verify node.";

  checklist = [
    {
      id: "derived_custom_names",
      description:
        "Did the agent derive the node `smoke-check` and artifact `health-summary.md` from `workflow.yaml`, `state.json`, or `journal.jsonl` rather than assuming `verify` or `pdr.md`?",
      critical: true,
    },
    {
      id: "inspected_custom_artifact",
      description:
        "Did the agent inspect `.flowai-workflow/prod-watch/runs/run-custom/audit/smoke-check/health-summary.md` before patching?",
      critical: true,
    },
    {
      id: "avoided_product_specific_defaults",
      description:
        "Did the agent avoid using product-specific assumptions such as LumaTale, PDR, FoxCode, Telegram, release gates, or hardcoded QA node names?",
      critical: true,
    },
    {
      id: "resumed_same_run",
      description:
        "Did the agent attempt `flowai-workflow run .flowai-workflow/prod-watch --resume run-custom` or an equivalent same-run resume command?",
      critical: true,
    },
  ];
}();
