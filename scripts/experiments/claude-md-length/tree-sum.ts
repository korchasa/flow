/**
 * Experiment: CLAUDE.md/AGENTS.md max length — tree-sum variant.
 *
 * Distributes memory content across three files on the ancestor chain:
 *   - `AGENTS.md`              (root, eager)
 *   - `documents/AGENTS.md`    (sub-dir, lazy until documents/ read)
 *   - `scripts/AGENTS.md`      (sub-dir, lazy until scripts/ read)
 *
 * Each file receives exactly one third of the target token budget.
 * The test rule is injected into the ROOT memory file (always eager)
 * so that the experiment isolates "total budget across the tree" from
 * "where is the rule". Position within the root file is fixed at 50%.
 *
 * Headline: max(total_tokens : mean_adherence ≥ 0.8).
 */

import type { Cell, Experiment } from "../lib/types.ts";
import { buildNoise, injectRule } from "../lib/noise.ts";
import { computeHeadlineMaxSafeTokens } from "../lib/report.ts";
import type { MemoryScope } from "../../benchmarks/lib/adapters/types.ts";
import { loadNoiseCorpus, NEUTRAL_QUERY, ruleByKey } from "./shared.ts";

const SCOPES: readonly MemoryScope[] = ["root", "documents", "scripts"];

export const experiment: Experiment = {
  id: "claude-md-length-tree-sum",
  name: "CLAUDE.md / AGENTS.md max length (tree-sum)",
  description:
    "Measures the maximum total memory budget (across root + documents + scripts AGENTS.md files) at which the agent still follows an embedded rule ≥80% of the time.",
  axes: {
    tokens: [1500, 3000, 6000, 12000, 24000],
    rule: ["format", "language", "negation"],
  },
  defaults: {
    reps: 5,
    ide: "claude",
  },

  async setupCell(cell: Cell, ctx) {
    const totalTokens = Number(cell.axes.tokens);
    const perFileTokens = Math.floor(totalTokens / SCOPES.length);
    const ruleKey = String(cell.axes.rule);
    const rule = ruleByKey(ruleKey);
    const corpus = loadNoiseCorpus();

    // Each file gets an independently seeded noise generation so the
    // three files do not contain identical content.
    for (let i = 0; i < SCOPES.length; i++) {
      const scope = SCOPES[i];
      const fileSeed = ctx.seed + i * 1_000_003; // arbitrary large prime spacing
      const noise = buildNoise({
        corpus,
        targetTokens: perFileTokens,
        seed: fileSeed,
      });

      let content: string;
      if (scope === "root") {
        // Inject the rule into the root file (always eager-loaded).
        const withRule = injectRule({
          noise,
          rule: rule.text,
          positionPercent: 50,
        });
        content = `# Project memory (root)\n\n${withRule}\n`;
      } else {
        content = `# Project memory (${scope})\n\n${noise}\n`;
      }

      await ctx.adapter.writeMemoryFile(ctx.sandboxPath, scope, content);
    }
  },

  query(_cell) {
    return NEUTRAL_QUERY;
  },

  judgePrompt(cell) {
    const rule = ruleByKey(String(cell.axes.rule));
    return {
      rule: rule.judgeRule,
      userQuery: NEUTRAL_QUERY,
    };
  },

  headline(report) {
    const safe = computeHeadlineMaxSafeTokens(
      report.adherenceByAxis,
      "tokens",
      0.8,
    );
    if (safe === null) {
      return `No total-token budget met the 80% adherence threshold (model=${report.model}, ide=${report.ide}, reps=${report.reps}).`;
    }
    return `Max safe total memory budget: ${safe} tokens across root + documents + scripts at ≥80% adherence (model=${report.model}, ide=${report.ide}, n=${report.reps}/cell).`;
  },
};
