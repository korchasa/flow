import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { GitCommitterBench } from "./scenarios/git-committer.bench.ts";
import { BenchmarkResult, BenchmarkScenario, LLMMessage } from "./lib/types.ts";
import { chatCompletion } from "./lib/llm.ts";
import { evaluateChecklist } from "./lib/judge.ts";

const SCENARIOS: BenchmarkScenario[] = [
  GitCommitterBench,
];

async function runScenario(
  scenario: BenchmarkScenario,
): Promise<BenchmarkResult> {
  console.log(`\nRunning scenario: ${scenario.name} (${scenario.id})...`);

  // 1. Setup Sandbox
  const sandboxPath = await Deno.makeTempDir({ prefix: "cursor_bench_" });
  console.log(`  Sandbox created: ${sandboxPath}`);

  try {
    await scenario.setup(sandboxPath);

    // 2. Load Agent Prompt
    const agentPath = join(Deno.cwd(), scenario.targetAgentPath);
    const agentContent = await Deno.readTextFile(agentPath);

    // 3. Run Agent (Simulation)
    // We simulate the agent loop:
    // User -> LLM (with Agent System Prompt) -> Tool Calls (Simulated) -> Output

    const messages: LLMMessage[] = [
      { role: "system", content: agentContent },
      { role: "user", content: scenario.userQuery },
    ];

    const start = performance.now();
    let tokensUsed = 0;

    // For this v0.1 benchmark, we will do a SINGLE turn simulation.
    // Real agents are multi-turn, but for "git commit" it's often one-shot or two-shot.
    // We will ask the LLM to generate the shell commands it WOULD run.
    // To make this work with the text-based agent prompt, we append instructions to output commands in a specific block.

    messages[0].content += `\n\nIMPORTANT FOR BENCHMARK:
You are running in a benchmark mode. 
Instead of calling actual tools, output the shell commands you WANT to run inside a markdown code block like this:
\`\`\`bash
git status
\`\`\`
And then provide your final response.
`;

    console.log("  Invoking Agent LLM...");
    const response = await chatCompletion(
      messages,
      "google/gemini-2.0-flash-001",
      0,
    );
    tokensUsed += response.usage?.total_tokens || 0;

    const agentOutput = response.content;
    const durationMs = performance.now() - start;

    console.log("  Agent finished. Analyzing output...");

    // 4. Simulate Execution (Naive)
    // We look for bash blocks and execute them in the sandbox to create side effects for the Judge
    const bashRegex = /```bash\n([\s\S]*?)\n```/g;
    let match;
    let executedCommands = "";
    let toolCallsCount = 0;

    while ((match = bashRegex.exec(agentOutput)) !== null) {
      const script = match[1];
      const commands = script.split("\n").filter((line) =>
        line.trim() !== "" && !line.trim().startsWith("#")
      );

      for (const cmdStr of commands) {
        toolCallsCount++;
        executedCommands += `> ${cmdStr}\n`;

        // Very basic command parsing
        const parts = cmdStr.split(" ");
        const cmdName = parts[0];
        const cmdArgs = parts.slice(1).map((arg) => arg.replace(/^"|"$/g, "")); // simple unquote

        try {
          const command = new Deno.Command(cmdName, {
            args: cmdArgs,
            cwd: sandboxPath,
            stdout: "piped",
            stderr: "piped",
          });
          const output = await command.output();
          const stdout = new TextDecoder().decode(output.stdout);
          const stderr = new TextDecoder().decode(output.stderr);

          executedCommands += `STDOUT: ${stdout}\n`;
          if (stderr) executedCommands += `STDERR: ${stderr}\n`;
        } catch (e) {
          executedCommands += `ERROR: ${e}\n`;
        }
      }
    }

    // 5. Gather Evidence for Judge
    // Get git status/diff to show what happened
    const gitStatus = new Deno.Command("git", {
      args: ["status"],
      cwd: sandboxPath,
    });
    const statusOut = await gitStatus.output();

    const gitLog = new Deno.Command("git", {
      args: ["log", "-1", "--stat"],
      cwd: sandboxPath,
    });
    const logOut = await gitLog.output();

    const evidence = `
--- EXECUTED COMMANDS ---
${executedCommands}

--- FINAL GIT STATUS ---
${new TextDecoder().decode(statusOut.stdout)}

--- LAST COMMIT ---
${new TextDecoder().decode(logOut.stdout)}
    `;

    // 6. Judge
    console.log("  Judging results...");
    const checklistResults = await evaluateChecklist(
      scenario.userQuery,
      agentOutput, // The conversation log
      evidence, // The file/system state changes
      scenario.checklist,
    );

    // 7. Calculate Score
    const totalItems = scenario.checklist.length;
    const passedItems = Object.values(checklistResults).filter((v) => v).length;
    const score = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;
    const success = scenario.checklist.every((item) =>
      !item.critical || checklistResults[item.id]
    );

    return {
      scenarioId: scenario.id,
      success,
      score,
      durationMs,
      tokensUsed,
      toolCallsCount,
      checklistResults,
      logs: agentOutput,
    };
  } finally {
    // Cleanup
    try {
      await Deno.remove(sandboxPath, { recursive: true });
    } catch {
      // ignore
    }
  }
}

async function main() {
  const args = parse(Deno.args);
  const filter = args._[0];

  const scenariosToRun = filter
    ? SCENARIOS.filter((s) => s.id.includes(String(filter)))
    : SCENARIOS;

  console.log(`Found ${scenariosToRun.length} scenarios.`);

  const results: BenchmarkResult[] = [];

  for (const scenario of scenariosToRun) {
    try {
      const result = await runScenario(scenario);
      results.push(result);

      console.log(
        `  Result: ${result.success ? "PASSED" : "FAILED"} (Score: ${
          result.score.toFixed(1)
        }%)`,
      );
      console.log("  Checklist:");
      for (const [id, passed] of Object.entries(result.checklistResults)) {
        console.log(`    [${passed ? "x" : " "}] ${id}`);
      }
    } catch (e) {
      console.error(`  Error running scenario ${scenario.id}:`, e);
    }
  }

  console.log("\n--- SUMMARY ---");
  console.table(results.map((r) => ({
    id: r.scenarioId,
    success: r.success,
    score: r.score.toFixed(1),
    ms: r.durationMs.toFixed(0),
    tokens: r.tokensUsed,
  })));
}

if (import.meta.main) {
  main();
}
