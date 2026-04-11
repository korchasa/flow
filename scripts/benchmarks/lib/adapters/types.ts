import type { SessionUsage } from "../usage.ts";

export interface AgentAdapter {
  /** IDE identifier */
  readonly ide: "cursor" | "claude" | "opencode";

  /** Config directory name relative to sandbox (e.g. ".cursor", ".claude") */
  readonly configDir: string;

  /** Binary name or path */
  readonly command: string;

  /** Output format used by the CLI (for log formatting) */
  readonly outputFormat: "stream-json" | "json";

  /** Build CLI arguments for a single agent step */
  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
    name?: string;
  }): string[];

  /** Parse raw stdout into structured output */
  parseOutput(stdout: string): ParsedAgentOutput;

  /** Extra environment variables needed for this IDE's CLI */
  getEnv(): Record<string, string>;

  /** Setup tool mocks in the sandbox (hooks mechanism is IDE-specific) */
  setupMocks(sandboxPath: string, mocks: Record<string, string>): Promise<void>;

  /** Calculate token usage for a session (best-effort, may return null) */
  calculateUsage(sessionId: string): Promise<SessionUsage | null>;

  /**
   * Returns env vars that isolate the agent from user-level state
   * (global memory files, cached settings, OAuth state in HOME).
   * Used by experiments to ensure trials only see the memory files
   * the experiment explicitly placed in the sandbox.
   *
   * @param configDir An empty directory the adapter may use to redirect
   *                  the IDE's config-dir lookups (e.g. CLAUDE_CONFIG_DIR).
   * @returns Env var map to merge into the spawned process environment.
   *          MAY throw if the adapter cannot produce a clean room
   *          (e.g. cannot reach keychain, OAuth token expired).
   */
  getCleanroomEnv(configDir: string): Promise<Record<string, string>>;

  /**
   * Write an agent-memory file into the sandbox at the specified scope.
   * Used by experiments to inject CLAUDE.md/AGENTS.md/.cursorrules content.
   *
   * Scopes:
   * - "root": project root memory file (loaded eagerly at session start).
   * - "documents": sub-directory memory file (loaded when agent reads that dir).
   * - "scripts": sub-directory memory file.
   * - "global": user-level global memory file (e.g. ~/.claude/CLAUDE.md).
   *
   * Implementations MAY throw `MemoryScopeNotSupportedError` for scopes
   * the target IDE does not support — callers are expected to catch or
   * skip those cells.
   */
  writeMemoryFile(
    sandboxPath: string,
    scope: MemoryScope,
    content: string,
  ): Promise<void>;
}

/** Scope of an agent-memory file. */
export type MemoryScope = "root" | "documents" | "scripts" | "global";

/** Thrown when an adapter cannot honor a requested memory-file scope. */
export class MemoryScopeNotSupportedError extends Error {
  constructor(ide: string, scope: MemoryScope) {
    super(`IDE "${ide}" does not support memory scope "${scope}"`);
    this.name = "MemoryScopeNotSupportedError";
  }
}

export interface ParsedAgentOutput {
  sessionId: string | null;
  result: string | null;
  subtype: string | null; // "success" | "input_required" | "error"
  /** Full concatenated text from all assistant messages (for UserEmulator context). */
  assistantText: string | null;
  raw: unknown;
}
