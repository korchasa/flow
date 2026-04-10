/**
 * Validates that all framework primitives (skills, commands, agents, hooks) use the expected name prefix.
 *
 * Checks:
 * - NP-1: All primitives must start with "flowai-".
 * - NP-2: Commands under `<pack>/commands/` must match `/^flowai-/` AND must NOT match `/^flowai-skill-/` — user-only workflow prefixes.
 * - NP-3: Skills under `<pack>/skills/` must match `/^flowai-skill-/` — agent-invocable capability prefix.
 *
 * NP-2 and NP-3 exist to catch misplacement: a primitive whose name shape does
 * not match its directory classification is either in the wrong directory or
 * has the wrong name, both of which are author mistakes.
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";

const REQUIRED_PREFIX = "flowai-";
// Skill names — must start with `flowai-skill-`. Checked first because the
// command pattern overlaps with the `flowai-` baseline.
const SKILL_PREFIX_RE = /^flowai-skill-/;
// Command names — must start with `flowai-` but NOT with `flowai-skill-`.
// The `flowai-setup-*` subfamily is a command (setup workflow), not a skill.
const COMMAND_PREFIX_RE = /^flowai-(?!skill-)/;

export type NamingError = {
  name: string;
  kind: "skill" | "command" | "agent" | "hook";
  criterion: string;
  message: string;
};

/**
 * Validates that a primitive name starts with the required prefix and matches
 * the kind-specific convention.
 */
export function validateNamingPrefix(
  name: string,
  kind: "skill" | "command" | "agent" | "hook",
): NamingError[] {
  if (name.length === 0) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message: `${kind} name is empty`,
    }];
  }

  if (!name.startsWith(REQUIRED_PREFIX)) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message: `${kind} '${name}' must start with '${REQUIRED_PREFIX}' prefix`,
    }];
  }

  // NP-2 / NP-3: kind-specific prefix conventions for commands vs skills.
  // Commands are user-invoked workflows; skills are agent-invocable capabilities.
  // A name in the wrong shape for its directory is almost always a misplaced
  // primitive — surface it loudly at validation time.
  if (kind === "command" && !COMMAND_PREFIX_RE.test(name)) {
    return [{
      name,
      kind,
      criterion: "NP-2",
      message:
        `command '${name}' must start with 'flowai-' but not 'flowai-skill-' ` +
        `(user-only workflow; 'flowai-skill-*' is reserved for skills/)`,
    }];
  }
  if (kind === "skill" && !SKILL_PREFIX_RE.test(name)) {
    return [{
      name,
      kind,
      criterion: "NP-3",
      message: `skill '${name}' must match /^flowai-skill-/ ` +
        `(agent-invocable capability)`,
    }];
  }

  return [];
}

/**
 * Discovers and validates all primitives in the framework directory.
 */
export async function validateAllNamingPrefixes(
  frameworkDir: string,
): Promise<NamingError[]> {
  const errors: NamingError[] = [];

  let packs: Deno.DirEntry[];
  try {
    packs = [];
    for await (const entry of Deno.readDir(frameworkDir)) {
      if (entry.isDirectory) packs.push(entry);
    }
  } catch {
    return [];
  }

  for (const pack of packs) {
    const packPath = join(frameworkDir, pack.name);

    // Skills: each subdirectory in <pack>/skills/
    const skillsDir = join(packPath, "skills");
    try {
      for await (const entry of Deno.readDir(skillsDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "skill"));
        }
      }
    } catch { /* no skills/ */ }

    // Commands: each subdirectory in <pack>/commands/ (user-only primitives)
    const commandsDir = join(packPath, "commands");
    try {
      for await (const entry of Deno.readDir(commandsDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "command"));
        }
      }
    } catch { /* no commands/ */ }

    // Agents: each .md file in <pack>/agents/ (excluding non-agent docs)
    const agentsDir = join(packPath, "agents");
    try {
      for await (const entry of Deno.readDir(agentsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const stem = entry.name.replace(/\.md$/, "");
          errors.push(...validateNamingPrefix(stem, "agent"));
        }
      }
    } catch { /* no agents/ */ }

    // Hooks: each subdirectory in <pack>/hooks/
    const hooksDir = join(packPath, "hooks");
    try {
      for await (const entry of Deno.readDir(hooksDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "hook"));
        }
      }
    } catch { /* no hooks/ */ }
  }

  return errors;
}

if (import.meta.main) {
  console.log(
    "Checking naming prefix (NP-1: all primitives must use 'flowai-' prefix)...",
  );

  const errors = await validateAllNamingPrefixes("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.kind} '${e.name}': ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log("✅ All primitives use 'flowai-' prefix.");
  }
}
