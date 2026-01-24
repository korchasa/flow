import { BenchmarkScenario } from "../lib/types.ts";
import { join } from "@std/path";

export const GitCommitterBench: BenchmarkScenario = {
  id: "git-committer-basic",
  name: "Basic Feature Commit",
  targetAgentPath: ".cursor/agents/git-committer.md",

  setup: async (sandboxPath: string) => {
    // Initialize a dummy git repo
    const cmd = new Deno.Command("git", {
      args: ["init"],
      cwd: sandboxPath,
      stdout: "null",
      stderr: "null",
    });
    await cmd.output();

    // Configure dummy user for git
    const configName = new Deno.Command("git", {
      args: ["config", "user.name", "Benchmark Bot"],
      cwd: sandboxPath,
    });
    await configName.output();

    const configEmail = new Deno.Command("git", {
      args: ["config", "user.email", "bot@example.com"],
      cwd: sandboxPath,
    });
    await configEmail.output();

    // Create a file and commit it so we have a HEAD
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Test Project");
    const add = new Deno.Command("git", {
      args: ["add", "."],
      cwd: sandboxPath,
    });
    await add.output();

    const commit = new Deno.Command("git", {
      args: ["commit", "-m", "Initial commit"],
      cwd: sandboxPath,
    });
    await commit.output();

    // Now create the "change" that needs to be committed
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const add = (a: number, b: number) => a + b; // New feature",
    );

    // Stage it? The agent might expect staged or unstaged.
    // Let's leave it unstaged to see if the agent handles 'git add'.
    // Actually, git-committer usually expects us to have staged changes or it adds them.
    // Let's leave it unstaged.
  },

  userQuery:
    "Я добавил функцию сложения в utils.ts. Закоммить это с сообщением 'add sum function'.",

  checklist: [
    {
      id: "git_add_executed",
      description:
        "Did the agent run 'git add' (or equivalent) to stage the file?",
      critical: true,
    },
    {
      id: "git_commit_executed",
      description: "Did the agent run 'git commit'?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description:
        "Does the commit message follow Conventional Commits (e.g., feat: ...)?",
      critical: false, // The user provided a specific message, so maybe the agent just used it. But the agent prompt says it should follow standards.
    },
    {
      id: "no_hallucinations",
      description: "Did the agent avoid inventing commands that don't exist?",
      critical: true,
    },
  ],
};
