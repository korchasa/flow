import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SupervisePhaseJournalDiagnostics = new class
  extends AcceptanceTestScenario {
  id = "supervise-phase-journal-diagnostics";
  name = "Uses journal-declared phase node directory before resume";
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
      "[benchmock-wf-phase] resume accepted for run-phase; continuing from failed qa/verify node.",
  };

  override sandboxState = {
    commits: [],
    modified: [
      ".flowai-workflow/custom/workflow.yaml",
      ".flowai-workflow/custom/agents/agent-verify.md",
    ],
    expectedOutcome:
      "Agent treats journal.jsonl as the recovery source when state.json is missing, finds the phase-qualified verify artifact, patches the root cause, and resumes run-phase without editing state.json.",
  };

  override async setup(sandboxPath: string) {
    const workflowDir = join(sandboxPath, ".flowai-workflow", "custom");
    const runDir = join(workflowDir, "runs", "run-phase");
    await ensureDir(join(workflowDir, "agents"));
    await ensureDir(join(runDir, "qa", "verify"));
    await ensureDir(join(runDir, "logs"));
    await Deno.writeTextFile(
      join(workflowDir, "workflow.yaml"),
      [
        'name: "custom-phase"',
        'version: "1"',
        "phases:",
        "  qa: [verify]",
        "nodes:",
        "  verify:",
        "    type: agent",
        "    label: Verify",
        "    system_prompt: '{{file(\".flowai-workflow/custom/agents/agent-verify.md\")}}'",
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
      "# Verify Agent\n\nWrite a concise report.\n",
    );
    const journal = [
      {
        kind: "run_started",
        run_id: "run-phase",
        config_path: ".flowai-workflow/custom/workflow.yaml",
      },
      {
        kind: "node_directory_declared",
        run_id: "run-phase",
        node_id: "verify",
        node_dir: ".flowai-workflow/custom/runs/run-phase/qa/verify",
      },
      {
        kind: "node_failed",
        run_id: "run-phase",
        node_id: "verify",
        error: "Validation failed: report.md missing required section Evidence",
      },
      {
        kind: "run_failed",
        run_id: "run-phase",
        status: "failed",
      },
    ].map((entry) => JSON.stringify(entry)).join("\n") + "\n";
    await Deno.writeTextFile(join(runDir, "journal.jsonl"), journal);
    await Deno.writeTextFile(
      join(runDir, "qa", "verify", "report.md"),
      "# Verification\n\nThe required Evidence section is missing.\n",
    );
    await Deno.writeTextFile(
      join(runDir, "logs", "verify.json"),
      JSON.stringify({ node_id: "verify", status: "failed" }) + "\n",
    );
  }

  userQuery =
    "Supervise .flowai-workflow/custom. Existing run id is run-phase, but state.json is missing after an interrupted write. Use the run journal and artifacts to diagnose the failed verify node, patch the workflow or agent prompt, then resume the same run once. Do not manually recreate or edit state.json.";

  checklist = [
    {
      id: "read_journal",
      description:
        "Did the agent read `.flowai-workflow/custom/runs/run-phase/journal.jsonl` and use journal events as the authoritative recovery source because `state.json` is missing?",
      critical: true,
    },
    {
      id: "inspected_phase_artifact",
      description:
        "Did the agent inspect the failed artifact under the phase-qualified path `.flowai-workflow/custom/runs/run-phase/qa/verify/`?",
      critical: true,
    },
    {
      id: "patched_root_cause",
      description:
        "Did the agent patch a root-cause surface such as `workflow.yaml` or `agents/agent-verify.md` after reading the failed artifact?",
      critical: true,
    },
    {
      id: "did_not_edit_state",
      description:
        "Did the agent avoid manually creating or editing `.flowai-workflow/custom/runs/run-phase/state.json` while recovering from the missing state file?",
      critical: true,
    },
    {
      id: "resumed_same_run",
      description:
        "Did the agent attempt `flowai-workflow run .flowai-workflow/custom --resume run-phase` or an equivalent same-run resume command?",
      critical: true,
    },
  ];
}();
