import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceBasicBench = new class extends BenchmarkSkillScenario {
  id = "flowai-maintenance-basic";
  name = "Basic Project Audit";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MaintenanceTarget",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "inline_findings",
      description:
        "Did the agent present its findings inline in the chat response (grouped by category), without creating any audit/report file under 'documents/tasks/' or elsewhere?",
      critical: true,
    },
    {
      id: "todo_found",
      description: "Did the findings identify the TODO in src/main.ts?",
      critical: true,
    },
    {
      id: "god_object_found",
      description:
        "Did the findings identify SystemManager as a God Object candidate?",
      critical: true,
    },
    {
      id: "unused_export_found",
      description: "Did the findings identify unusedExport?",
      critical: true,
    },
    {
      id: "constructive_fixes",
      description:
        "Does every identified issue include a '(Fix: ...)' proposal or recommendation?",
      critical: false,
    },
    {
      id: "file_length_check",
      description:
        "Did the findings check for files exceeding 500 lines or functions exceeding 50 lines?",
      critical: false,
    },
  ];
}();
