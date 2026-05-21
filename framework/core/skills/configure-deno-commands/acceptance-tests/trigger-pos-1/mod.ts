import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ConfigureDenoCommandsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "configure-deno-commands-trigger-pos-1";
  name = "set up standard deno tasks";
  skill = "configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Please set up the standard deno tasks for this project — check, test, dev, and prod — wired into deno.json and a scripts/ directory.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `configure-deno-commands` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `configure-deno-commands`.",
    critical: true,
  }];
}();
