import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ScaffoldInitAndAdapt = new class extends AcceptanceTestScenario {
  id = "flowai-scaffold-init-and-adapt";
  name = "Runs flowai-workflow init, then adapts scaffolded files";
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
      "[benchmock-wfscaf] flowai-workflow init created .flowai-workflow/github-inbox/workflow.yaml and agents/agent-triage.md.",
  };

  override sandboxState = {
    commits: [],
    modified: [
      ".flowai-workflow/github-inbox/workflow.yaml",
      ".flowai-workflow/github-inbox/agents/agent-triage.md",
    ],
    expectedOutcome:
      "Agent invokes flowai-workflow init, then adapts workflow.yaml and agent prompt for the project instead of stopping after the scaffold command.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "github-inbox");
    await ensureDir(join(workflowDir, "agents"));
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        "name: github-inbox",
        'version: "1"',
        "defaults:",
        "  runtime: claude",
        "  model: claude-sonnet-4-6",
        "  prepare_command: git fetch origin main",
        "nodes:",
        "  triage:",
        "    type: agent",
        "    label: Triage",
        "    prompt: Read GitHub issues for REPO_PLACEHOLDER.",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(workflowDir, "agents", "agent-triage.md"),
      [
        "# Triage Agent",
        "",
        "Project: REPO_PLACEHOLDER",
        "Checks: CHECK_COMMAND_PLACEHOLDER",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "Add a flowai-workflow GitHub issue triage pipeline to this repo. Use the bundled github-inbox workflow and adapt it for this Deno project.";

  checklist = [
    {
      id: "ran_init",
      description:
        "Did the agent attempt to run `flowai-workflow init --workflow github-inbox` or an equivalent `flowai-workflow init` command for the requested bundled workflow?",
      critical: true,
    },
    {
      id: "adapted_workflow_yaml",
      description:
        "After the scaffold command, did the agent inspect or edit `.flowai-workflow/github-inbox/workflow.yaml` for project-specific values such as runtime, model, repo references, or check commands?",
      critical: true,
    },
    {
      id: "adapted_agent_prompt",
      description:
        "Did the agent inspect or edit `.flowai-workflow/github-inbox/agents/agent-triage.md` (or another scaffolded agent prompt) instead of treating the generated scaffold as complete without adaptation?",
      critical: true,
    },
  ];
}();
