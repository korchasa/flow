import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ScaffoldExistingWorkflowAdaptation = new class
  extends AcceptanceTestScenario {
  id = "flowai-scaffold-existing-workflow-adaptation";
  name = "Adapts an existing workflow directory instead of forcing init";
  skill = "flowai-scaffold";
  agentsTemplateVars = {
    PROJECT_NAME: "WorkflowTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS: "- Check: `deno task check`",
  };
  maxSteps = 8;
  stepTimeoutMs = 300_000;
  mocks: Record<string, string> = {
    "flowai-workflow":
      "[benchmock-wf-existing] dry run ok for .flowai-workflow/custom; nodes: intake, analyze, report.",
  };

  override sandboxState = {
    commits: [],
    modified: [
      ".flowai-workflow/custom/.gitignore",
      ".flowai-workflow/custom/workflow.yaml",
      ".flowai-workflow/custom/agents/agent-analyze.md",
      ".flowai-workflow/custom/scripts/check-report.sh",
    ],
    expectedOutcome:
      "Agent inspects the existing workflow directory, adapts workflow.yaml, agents, scripts, and ignore policy, validates with run --dry-run, and does not run init.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "custom");
    await ensureDir(join(workflowDir, "agents"));
    await ensureDir(join(workflowDir, "memory"));
    await ensureDir(join(workflowDir, "scripts"));
    await Deno.writeTextFile(
      join(workflowDir, ".gitignore"),
      [
        "runs/",
        "memory/agent-*.md",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        'name: "custom-review"',
        'version: "1"',
        "defaults:",
        "  runtime: claude",
        "  model: claude-sonnet-4-6",
        "nodes:",
        "  intake:",
        "    type: agent",
        "    label: Intake",
        "    prompt: Read TASK_PLACEHOLDER and write {{node_dir}}/brief.md.",
        "  analyze:",
        "    type: agent",
        "    label: Analyze",
        "    inputs: [intake]",
        "    system_prompt: '{{file(\".flowai-workflow/custom/agents/agent-analyze.md\")}}'",
        "    prompt: Analyze {{input.intake}}/brief.md for PROJECT_PLACEHOLDER.",
        "    validate:",
        "      - type: custom_script",
        "        path: .flowai-workflow/custom/scripts/check-report.sh",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "agents", "agent-analyze.md"),
      [
        "# Analyze Agent",
        "",
        "Project: PROJECT_PLACEHOLDER",
        "Check command: CHECK_COMMAND_PLACEHOLDER",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "memory", "reflection-protocol.md"),
      "# Reflection Protocol\n\nUse project-specific lessons only.\n",
    );
    await Deno.writeTextFile(
      join(workflowDir, "scripts", "check-report.sh"),
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'grep -q PROJECT_PLACEHOLDER "$1"',
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "We already have .flowai-workflow/custom in this repo. Adapt that existing flowai-workflow for this Deno project, including agent prompts, scripts, memory/ignore policy, and config validation. Do not scaffold a new bundled workflow.";

  checklist = [
    {
      id: "inspected_existing_tree",
      description:
        "Did the agent inspect the existing workflow tree, including `workflow.yaml`, `agents/`, `scripts/`, `memory/`, and `.gitignore`, instead of starting from `flowai-workflow init`?",
      critical: true,
    },
    {
      id: "adapted_existing_files",
      description:
        "Did the agent adapt existing workflow files across config, agent prompt, script, and ignore/memory policy with project-specific values?",
      critical: true,
    },
    {
      id: "validated_run_dry_run",
      description:
        "Did the agent run the current CLI validation shape `flowai-workflow run .flowai-workflow/custom --dry-run` after adaptation, rather than an obsolete `flowai-workflow validate` command?",
      critical: true,
    },
    {
      id: "avoided_init",
      description:
        "Did the agent avoid running `flowai-workflow init` because the user explicitly supplied an existing workflow directory?",
      critical: true,
    },
  ];
}();
