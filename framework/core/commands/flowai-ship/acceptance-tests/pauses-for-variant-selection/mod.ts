import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Plan → Implement gate. The user invokes /flowai-ship but DECLINES variant
 * selection ("none of these, let me rethink"). The agent must STOP at the
 * Plan → Implement gate without entering Implement Phase, and must NOT
 * touch the working tree beyond the Plan Phase's allowed artefacts.
 */
export const ShipPausesForVariantSelection = new class
  extends AcceptanceTestScenario {
  id = "flowai-ship-pauses-for-variant-selection";
  name = "STOPs at Plan → Implement gate when user declines variants";
  skill = "flowai-ship";
  maxSteps = 30;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery = "/flowai-ship Add a trim helper to strings.ts";

  userPersona =
    `You are a developer who started /flowai-ship but changes your mind during variant selection.
When the agent presents Plan-Phase variants, reply "None of these match — let me rethink. Please STOP."
Do not provide further input.`;

  checklist = [
    {
      id: "variants_presented",
      description:
        "Did the Plan Phase present at least 2 implementation variants in chat?",
      critical: true,
    },
    {
      id: "stopped_at_gate",
      description:
        "After the user declined variant selection, did the agent STOP without entering the Implement Phase? Look for the absence of any Implement-Phase RED/GREEN/CHECK steps in the trace AND a STOP/abort message acknowledging the decline.",
      critical: true,
    },
    {
      id: "no_implementation_changes",
      description:
        "Inspect the working tree after the agent stops. There must be NO source-code changes (no edits to `strings.ts` etc.). Only the Plan-Phase task file under `documents/tasks/` is allowed.",
      critical: true,
    },
  ];
}();
