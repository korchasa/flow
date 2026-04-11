/**
 * Experiment: CLAUDE.md/AGENTS.md max length — single-file variant.
 *
 * Places all memory content in one root AGENTS.md (plus a CLAUDE.md
 * symlink, handled by the adapter). Sweeps total size in tokens ×
 * rule type × repetitions.
 *
 * Headline: max(tokens : mean_adherence ≥ 0.8).
 */

import type { Cell, Experiment } from "../lib/types.ts";
import { buildNoise, injectRule } from "../lib/noise.ts";
import { computeHeadlineMaxSafeTokens } from "../lib/report.ts";
import { loadNoiseCorpus, NEUTRAL_QUERY, ruleByKey } from "./shared.ts";

export const experiment: Experiment = {
  id: "claude-md-length-single-file",
  name: "CLAUDE.md / AGENTS.md max length (single file)",
  description:
    "Measures the maximum size (in tokens) of a single root AGENTS.md file at which the agent still follows an embedded rule ≥80% of the time.",
  axes: {
    tokens: [500, 1000, 2000, 4000, 8000, 16000],
    rule: ["format", "language", "negation"],
  },
  defaults: {
    reps: 5,
    ide: "claude",
  },

  async setupCell(cell: Cell, ctx) {
    const targetTokens = Number(cell.axes.tokens);
    const ruleKey = String(cell.axes.rule);
    const rule = ruleByKey(ruleKey);

    const corpus = loadNoiseCorpus();
    const noise = buildNoise({
      corpus,
      targetTokens,
      seed: ctx.seed,
    });
    const memory = injectRule({
      noise,
      rule: rule.text,
      positionPercent: 50,
    });

    // Prepend a brief heading so the file looks like a real AGENTS.md
    const content = `# Project memory\n\n${memory}\n`;
    await ctx.adapter.writeMemoryFile(ctx.sandboxPath, "root", content);
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
      return `No token count met the 80% adherence threshold (model=${report.model}, ide=${report.ide}, reps=${report.reps}).`;
    }
    return `Max safe AGENTS.md size: ${safe} tokens at ≥80% adherence (model=${report.model}, ide=${report.ide}, n=${report.reps}/cell).`;
  },
};
