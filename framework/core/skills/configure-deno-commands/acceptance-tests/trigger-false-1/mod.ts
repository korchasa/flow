import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: ad-hoc Deno command invocation, not configuring the standard
// deno.json/scripts interface.
export const ConfigureDenoCommandsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "configure-deno-commands-trigger-false-1";
  name = "ad-hoc deno command run";
  skill = "configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run `deno fmt` on the repo and tell me which files got reformatted — just a one-off cleanup before I commit.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `configure-deno-commands/SKILL.md` or calling the `Skill` tool with `configure-deno-commands`.",
    critical: true,
  }];
}();
