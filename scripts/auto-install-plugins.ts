import { parse as parseToml } from "@std/toml";

export const ENV_AUTO_INSTALL_PLUGINS = "AUTO_INSTALL_PLUGINS";

type ClaudePluginListEntry = {
  id?: unknown;
  scope?: unknown;
  enabled?: unknown;
};

type CommandOutput = {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function runCaptured(
  cmd: string,
  args: string[],
): Promise<CommandOutput> {
  const output = await new Deno.Command(cmd, {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    success: output.success,
    code: output.code,
    stdout: decode(output.stdout),
    stderr: decode(output.stderr),
  };
}

async function runInherited(cmd: string, args: string[]): Promise<void> {
  const status = await new Deno.Command(cmd, {
    args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) {
    throw new Error(
      `Command failed (${status.code ?? 1}): ${cmd} ${args.join(" ")}`,
    );
  }
}

function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 0) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function autoInstallEnabled(dotenvContent: string): boolean {
  return parseDotenv(dotenvContent)[ENV_AUTO_INSTALL_PLUGINS] === "true";
}

export async function shouldAutoInstall(dotenvPath = ".env"): Promise<boolean> {
  if (Deno.env.get(ENV_AUTO_INSTALL_PLUGINS) === "true") return true;
  try {
    return autoInstallEnabled(await Deno.readTextFile(dotenvPath));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

export function installedClaudeFlowaiPluginIds(
  entries: ClaudePluginListEntry[],
): string[] {
  return entries
    .filter((entry) =>
      typeof entry.id === "string" &&
      isFlowaiMarketplacePluginId(entry.id) &&
      entry.scope === "user" &&
      entry.enabled === true
    )
    .map((entry) => entry.id as string)
    .sort();
}

async function readClaudeInstalledFlowaiPlugins(): Promise<string[]> {
  const result = await runCaptured("claude", ["plugin", "list", "--json"]);
  if (!result.success) {
    throw new Error(
      `Failed to list Claude Code plugins (${result.code}): ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    );
  }
  const parsed = JSON.parse(result.stdout) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Claude Code plugin list returned non-array JSON.");
  }
  return installedClaudeFlowaiPluginIds(parsed as ClaudePluginListEntry[]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFlowaiMarketplacePluginId(pluginId: string): boolean {
  if (!pluginId.endsWith("@flowai-plugins")) return false;
  const name = pluginId.slice(0, -"@flowai-plugins".length);
  return name === "flowai" || name.startsWith("flowai-");
}

export function codexInstalledFlowaiPluginsFromConfig(
  configToml: string,
): string[] {
  const parsed = parseToml(configToml);
  const plugins = isRecord(parsed.plugins) ? parsed.plugins : {};
  return Object.entries(plugins)
    .filter(([pluginId, config]) =>
      isFlowaiMarketplacePluginId(pluginId) &&
      isRecord(config) &&
      config.enabled === true
    )
    .map(([pluginId]) => pluginId)
    .sort();
}

async function readCodexInstalledFlowaiPlugins(): Promise<string[]> {
  const home = Deno.env.get("CODEX_HOME") ?? `${Deno.env.get("HOME")}/.codex`;
  const configPath = `${home}/config.toml`;
  try {
    return codexInstalledFlowaiPluginsFromConfig(
      await Deno.readTextFile(configPath),
    );
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
}

async function codexSupportsPluginAdd(): Promise<boolean> {
  const result = await runCaptured("codex", ["plugin", "add", "--help"]);
  return result.success;
}

async function updateClaudePlugins(): Promise<void> {
  const pluginIds = await readClaudeInstalledFlowaiPlugins();
  if (pluginIds.length === 0) {
    console.log(
      "[auto-install-plugins] No enabled user-scope Claude Code flowai plugins found.",
    );
    return;
  }
  for (const pluginId of pluginIds) {
    console.log(`[auto-install-plugins] Updating Claude Code ${pluginId}`);
    await runInherited("claude", [
      "plugin",
      "update",
      pluginId,
      "--scope",
      "user",
    ]);
  }
}

async function updateCodexPlugins(): Promise<void> {
  const pluginIds = await readCodexInstalledFlowaiPlugins();
  if (pluginIds.length === 0) {
    console.log(
      "[auto-install-plugins] No enabled Codex flowai plugins found in ~/.codex/config.toml.",
    );
    return;
  }
  if (!(await codexSupportsPluginAdd())) {
    console.log(
      "[auto-install-plugins] Codex CLI does not support `codex plugin add`; update Codex or reinstall flowai plugins through /plugins.",
    );
    return;
  }
  for (const pluginId of pluginIds) {
    console.log(`[auto-install-plugins] Reinstalling Codex ${pluginId}`);
    await runInherited("codex", ["plugin", "add", pluginId]);
  }
}

async function main(): Promise<void> {
  if (!(await shouldAutoInstall())) {
    console.log(
      `[auto-install-plugins] ${ENV_AUTO_INSTALL_PLUGINS}=true is not set; skipping plugin updates.`,
    );
    return;
  }

  await updateClaudePlugins();
  await updateCodexPlugins();
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
