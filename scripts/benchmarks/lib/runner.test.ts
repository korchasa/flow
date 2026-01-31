import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario } from "./types.ts";
import { evaluateChecklist } from "./judge.ts";

Deno.test("Runner - Spawned Agent Interaction", async () => {
  // 1. Setup
  const tempDir = await Deno.makeTempDir();
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "You are a test agent.");

  // Create a dummy cursor-agent script that behaves like the real one
  const mockAgentBin = join(tempDir, "cursor-agent");
  await Deno.writeTextFile(mockAgentBin, `#!/bin/sh
echo "AGENT: Initializing..."
# In --print mode, prompt is the last argument
# We just simulate some work
echo "AGENT: Received prompt: $@"
echo "AGENT: Modifying file..."
echo "modified" > test.txt
echo "AGENT: Done."
exit 0
`);
  await Deno.chmod(mockAgentBin, 0o755);

  // Add tempDir to PATH so spawned agent can find mock cursor-agent
  const originalPath = Deno.env.get("PATH");
  Deno.env.set("PATH", `${tempDir}:${originalPath}`);

  const scenario: BenchmarkScenario = {
    id: "test-scenario",
    name: "Test Scenario",
    targetAgentPath: agentPath,
    setup: async (sandbox) => {
      await Deno.writeTextFile(join(sandbox, "test.txt"), "initial");
    },
    userQuery: "Change test.txt to 'modified'",
    agentsMarkdown: "# Test Agent\n- Rule 1",
    checklist: [
      { id: "check1", description: "File modified", critical: true },
    ],
  };

  const judgeClient = async () => {
    await Promise.resolve(); 
    return {
      results: {
        check1: { pass: true, reason: "Test passed" },
      },
      messages: [],
      response: "Judge response",
    };
  };

  try {
    const result = await runScenario(scenario, {
      agentConfig: { model: "test-model" },
      judgeConfig: { model: "judge-model" },
      workDir: tempDir,
      judgeClient: judgeClient as typeof evaluateChecklist,
    });

    // Assertions
    assertEquals(result.success, true);
    
    // Check if file was modified (side effect)
    const sandboxPath = join(tempDir, "test-scenario", "sandbox");
    const content = await Deno.readTextFile(join(sandboxPath, "test.txt"));
    assertEquals(content.trim(), "modified");
  } finally {
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
    if (originalPath) Deno.env.set("PATH", originalPath);
  }
});
