import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * End-to-end happy path: user invokes /flowai-ship with a simple task; the
 * agent runs Plan (proposes variants, user selects), Implement (TDD cycle),
 * Review (Approve), Commit (one commit with doc sync), Push (clean
 * fast-forward against a bare-repo origin). The checklist verifies every
 * phase transition + post-push verification.
 */
export const ShipFullCycleSuccess = new class extends AcceptanceTestScenario {
  id = "flowai-ship-full-cycle-success";
  name = "Plan → Implement → Review → Commit → Push happy path";
  skill = "flowai-ship";
  // Long-running multi-phase trace — budget generously.
  maxSteps = 60;
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Shipper",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/add-trim"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/add-trim"]);
    await Deno.writeTextFile(
      `${sandboxPath}/strings.ts`,
      "/** Capitalize the first character. */\nexport function capitalize(s: string): string {\n  if (s.length === 0) return s;\n  return s[0].toUpperCase() + s.slice(1);\n}\n",
    );
    await runGit(sandboxPath, ["add", "strings.ts"]);
    await runGit(sandboxPath, ["commit", "-m", "init: capitalize"]);
    await runGit(sandboxPath, ["push", "origin", "feature/add-trim"]);
  }

  userQuery = "/flowai-ship Add a trim helper to strings.ts";

  userPersona =
    `You are a developer who wants the agent to plan, implement, review, commit, and push a small task end-to-end.
- When the agent presents Plan-Phase variants, pick the simplest one in one short sentence ("Go with variant 1.").
- When the Implement Phase reports results, acknowledge briefly.
- When the Review Phase asks anything, answer affirmatively.
- When the Commit Phase asks about documentation or grouping, accept its defaults.
- When the Push Phase asks anything (upstream, divergence), answer "yes, please push to origin/feature/add-trim".
Keep all answers short and on-topic.`;

  checklist = [
    {
      id: "skill_invoked",
      description:
        "Did the agent load `flowai-ship` (Skill tool call or read of `SKILL.md`)?",
      critical: true,
    },
    {
      id: "plan_phase_wrote_task_file",
      description:
        "Did the Plan Phase write a file at `documents/tasks/<YYYY>/<MM>/<slug>.md` with the required frontmatter (`date`, `status: to do`, `implements`, `tags`, `related_tasks`)?",
      critical: true,
    },
    {
      id: "plan_to_implement_gate",
      description:
        "Did the Plan Phase present at least 2 variants AND wait for the user's selection BEFORE writing the Solution section?",
      critical: true,
    },
    {
      id: "implement_observable_tdd",
      description:
        "Is the TDD cycle observable in the Implement Phase trace — RED (failing test first), GREEN (implementation), CHECK (project check exit 0)?",
      critical: true,
    },
    {
      id: "review_produced_verdict",
      description:
        "Did the Review Phase output a structured report whose FIRST line contains `Approve` (or `Request Changes` / `Needs Discussion`)?",
      critical: true,
    },
    {
      id: "commit_phase_ran",
      description:
        "Did the Commit Phase produce at least one git commit using Conventional Commits format (prefix like `feat:`, `agent:`, etc.)?",
      critical: true,
    },
    {
      id: "no_force_pushed",
      description:
        "Did the Push Phase run `git push` WITHOUT `--force` or `--force-with-lease`?",
      critical: true,
    },
    {
      id: "post_push_verification",
      description:
        "After push, did the agent verify `git rev-parse @{u}` matches local `HEAD`? This is the canonical 'work reached the remote' confirmation.",
      critical: true,
    },
  ];
}();
