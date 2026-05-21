import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MemexSaveTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "save-trigger-pos-1";
  name = "persist a URL into the memex";
  skill = "save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Save this Stripe pricing page (https://stripe.com/pricing) into our memex — extract the entities and cross-link to the existing payments notes.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `save` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `save`.",
    critical: true,
  }];
}();
