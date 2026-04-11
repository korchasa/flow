import { join } from "@std/path";
import type { AgentAdapter, MemoryScope, ParsedAgentOutput } from "./types.ts";
import { MemoryScopeNotSupportedError } from "./types.ts";
import type { SessionUsage } from "../usage.ts";

interface ClaudeEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
}

/**
 * Reads the Claude Code OAuth access token from the macOS keychain.
 * Throws on non-macOS or when the entry is missing.
 */
async function readClaudeOauthTokenFromKeychain(): Promise<string> {
  if (Deno.build.os !== "darwin") {
    throw new Error(
      "ClaudeAdapter.getCleanroomEnv: keychain-based auth is only supported on macOS",
    );
  }
  const cmd = new Deno.Command("security", {
    args: ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  if (!out.success) {
    const stderr = new TextDecoder().decode(out.stderr);
    throw new Error(
      `ClaudeAdapter.getCleanroomEnv: failed to read keychain entry "Claude Code-credentials": ${stderr}`,
    );
  }
  const raw = new TextDecoder().decode(out.stdout).trim();
  let parsed: { claudeAiOauth?: { accessToken?: string } };
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `ClaudeAdapter.getCleanroomEnv: keychain payload is not JSON: ${
        (e as Error).message
      }`,
    );
  }
  const token = parsed?.claudeAiOauth?.accessToken;
  if (!token) {
    throw new Error(
      "ClaudeAdapter.getCleanroomEnv: keychain payload missing claudeAiOauth.accessToken",
    );
  }
  return token;
}

/** Adapter for Claude Code CLI. Parses stream-json (NDJSON) output and uses settings.local.json for mocking. */
export class ClaudeAdapter implements AgentAdapter {
  readonly ide = "claude" as const;
  readonly configDir = ".claude";
  readonly command = "claude";
  readonly outputFormat = "stream-json" as const;

  getEnv(): Record<string, string> {
    // Unset CLAUDECODE to allow spawning claude inside a claude session
    return { CLAUDECODE: "" };
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
    name?: string;
  }): string[] {
    const args = [
      "-p",
      "--verbose",
      "--model",
      opts.model,
      "--output-format",
      "stream-json",
      "--permission-mode",
      "bypassPermissions",
    ];

    if (opts.name) {
      args.push("--name", opts.name);
    }

    if (opts.sessionId) {
      args.push("--resume", opts.sessionId);
    }

    if (opts.prompt) {
      args.push(opts.prompt);
    }

    return args;
  }

  parseOutput(stdout: string): ParsedAgentOutput {
    const result: ParsedAgentOutput = {
      sessionId: null,
      result: null,
      subtype: null,
      assistantText: null,
      raw: null,
    };

    // stream-json outputs one JSON event per line (NDJSON)
    const events: ClaudeEvent[] = [];
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed));
      } catch (_) {
        // Skip malformed lines
      }
    }

    if (events.length === 0) return result;

    result.raw = events;

    // Collect ALL text blocks from assistant messages (for UserEmulator context)
    const assistantTexts: string[] = [];

    // Extract data from events in order
    for (const event of events) {
      if (event.session_id) {
        result.sessionId = event.session_id;
      }

      if (event.type === "result") {
        result.subtype = event.subtype ?? null;
        if (event.result !== undefined) {
          result.result = event.result;
        }
      }

      // Collect text from all assistant messages
      if (event.type === "assistant" && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            assistantTexts.push(block.text);
          }
        }
      }
    }

    // Fallback: use last assistant text if result is missing or empty
    if (!result.result && assistantTexts.length > 0) {
      result.result = assistantTexts[assistantTexts.length - 1];
    }

    result.assistantText = assistantTexts.length > 0
      ? assistantTexts.join("\n\n")
      : null;

    return result;
  }

  async setupMocks(
    sandboxPath: string,
    mocks: Record<string, string>,
  ): Promise<void> {
    if (!mocks || Object.keys(mocks).length === 0) return;

    const hooksDir = join(sandboxPath, this.configDir, "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });

    const preToolUse: Array<{
      matcher: string;
      hooks: Array<{ type: string; command: string }>;
    }> = [];

    for (const [tool, mockOutput] of Object.entries(mocks)) {
      const hookScriptPath = join(hooksDir, `mock-${tool}.sh`);
      const hookScript = `#!/bin/bash
# Read stdin (JSON with tool details)
read -r input

# Return mock response - deny execution and inject mock output
cat <<'MOCK_EOF'
{
  "decision": "block",
  "reason": ${JSON.stringify(mockOutput)}
}
MOCK_EOF
`;
      await Deno.writeTextFile(hookScriptPath, hookScript);
      await Deno.chmod(hookScriptPath, 0o755);

      preToolUse.push({
        matcher: `Bash(${tool}:*)`,
        hooks: [{
          type: "command",
          command: `.claude/hooks/mock-${tool}.sh`,
        }],
      });
    }

    const settings = {
      hooks: {
        preToolUse,
      },
    };

    await Deno.writeTextFile(
      join(sandboxPath, this.configDir, "settings.local.json"),
      JSON.stringify(settings, null, 2),
    );
  }

  async calculateUsage(_sessionId: string): Promise<SessionUsage | null> {
    // Claude Code transcript parsing not implemented yet — return null
    await Promise.resolve();
    return null;
  }

  /**
   * Returns env vars that isolate the spawned `claude` process from the
   * user's global state:
   * - `CLAUDE_CONFIG_DIR=<configDir>` — empty dir, prevents loading of
   *   `~/.claude/CLAUDE.md` and friends.
   * - `CLAUDE_CODE_OAUTH_TOKEN=<token>` — bypasses file-based OAuth
   *   resolution (which depends on the original HOME). Token is read
   *   from the macOS keychain entry `Claude Code-credentials`.
   * - `CLAUDECODE=""` — unset the marker that says we're inside Claude
   *   Code (enables the parent CLI to spawn a fresh subprocess).
   *
   * Throws if the keychain entry cannot be read (e.g. on Linux, or if
   * the user is not authenticated).
   */
  async getCleanroomEnv(
    configDir: string,
  ): Promise<Record<string, string>> {
    const token = await readClaudeOauthTokenFromKeychain();
    return {
      CLAUDE_CONFIG_DIR: configDir,
      CLAUDE_CODE_OAUTH_TOKEN: token,
      CLAUDECODE: "",
    };
  }

  /**
   * Writes an AGENTS.md file at the specified scope and creates a
   * CLAUDE.md symlink alongside it so Claude Code picks it up.
   * - root       → <sandbox>/AGENTS.md
   * - documents  → <sandbox>/documents/AGENTS.md
   * - scripts    → <sandbox>/scripts/AGENTS.md
   * - global     → <sandbox>/.claude-global/CLAUDE.md (simulated global;
   *                real ~/.claude/CLAUDE.md is outside sandbox and not
   *                safe to touch from experiments).
   */
  async writeMemoryFile(
    sandboxPath: string,
    scope: MemoryScope,
    content: string,
  ): Promise<void> {
    let dir: string;
    switch (scope) {
      case "root":
        dir = sandboxPath;
        break;
      case "documents":
        dir = join(sandboxPath, "documents");
        break;
      case "scripts":
        dir = join(sandboxPath, "scripts");
        break;
      case "global":
        // Simulated — real global CLAUDE.md is user-wide and must not be
        // mutated by an experiment. We stage a copy and note in SDS that
        // global-scope tests in Claude are approximations.
        dir = join(sandboxPath, ".claude-global");
        break;
      default:
        throw new MemoryScopeNotSupportedError(this.ide, scope);
    }

    await Deno.mkdir(dir, { recursive: true });
    const agentsPath = join(dir, "AGENTS.md");
    await Deno.writeTextFile(agentsPath, content);

    // Create/refresh CLAUDE.md symlink → AGENTS.md
    const claudePath = join(dir, "CLAUDE.md");
    try {
      await Deno.remove(claudePath);
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
    try {
      await Deno.symlink("AGENTS.md", claudePath);
    } catch (e) {
      // On systems without symlink support, fall back to a copy.
      if (
        e instanceof Deno.errors.PermissionDenied ||
        e instanceof Deno.errors.NotSupported
      ) {
        await Deno.writeTextFile(claudePath, content);
      } else {
        throw e;
      }
    }
  }
}
