import { assertEquals } from "@std/assert";
import { buildCheckPlan } from "./task-check.ts";

Deno.test("buildCheckPlan: prerequisites regenerates composite SKILL.md files", () => {
  const plan = buildCheckPlan();
  // implements [FR-SKILL-COMPOSE](../documents/requirements.md#fr-skill-compose-generated-composite-skill-assembly)
  // generator must run BEFORE any parallel check (fmt, lint, tests,
  // check-skills) so they see the rendered SKILL.md files on disk.
  const prereqLabels = plan.prerequisites.map((c) => c.args.join(" "));
  assertEquals(
    prereqLabels.some((l) =>
      l.includes("generate-skill-composites.ts") && l.includes("--write")
    ),
    true,
  );
});

Deno.test("buildCheckPlan: parallel covers fmt + lint + tests + validators", () => {
  const plan = buildCheckPlan();
  assertEquals(plan.parallel.length >= 10, true);

  // Verify key checks are present
  const labels = plan.parallel.map((c) => c.args.join(" "));
  assertEquals(labels.some((l) => l.includes("fmt --check")), true);
  assertEquals(labels.some((l) => l.includes("lint scripts")), true);
  assertEquals(labels.some((l) => l.includes("test -A")), true);
  assertEquals(labels.some((l) => l.includes("check-skills.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-agents.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-pack-refs.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-naming-prefix.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-srs-evidence.ts")), true);
  assertEquals(
    labels.some((l) => l.includes("check-trigger-coverage.ts")),
    true,
  );
  assertEquals(
    labels.some((l) => l.includes("check-task-format.ts")),
    true,
  );
});
