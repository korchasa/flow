import { assertEquals } from "@std/assert";
import { resolve } from "@std/path";
import {
  computePlan,
  type FrameworkAssets,
  type IDEConfig,
} from "./install.ts";

// --- discoverFramework is tested implicitly via integration (reads real fs) ---
// We test computePlan which is a pure function.

const FRAMEWORK_DIR = "/fake/framework";

function makeIDE(
  overrides: Partial<IDEConfig> = {},
): IDEConfig {
  return {
    name: "TestIDE",
    configDir: "/fake/home/.testide",
    supportsAgents: true,
    agentSubdir: "testide",
    ...overrides,
  };
}

function makeAssets(
  overrides: Partial<FrameworkAssets> = {},
): FrameworkAssets {
  return {
    frameworkDir: FRAMEWORK_DIR,
    skills: ["flow-commit", "flow-plan"],
    agents: ["flow-commit.md", "flow-diff-specialist.md"],
    ...overrides,
  };
}

// --- computePlan tests ---

Deno.test("computePlan: creates items for all skills and agents", async () => {
  const ide = makeIDE();
  const assets = makeAssets();

  const fsMock = {
    lstat: (_path: string) => {
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (_path: string): string => {
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {
          // empty directory
        },
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  // 2 skills + 2 agents = 4 items, all "create"
  assertEquals(items.length, 4);
  assertEquals(items.filter((i) => i.action === "create").length, 4);
  assertEquals(items.filter((i) => i.type === "skill").length, 2);
  assertEquals(items.filter((i) => i.type === "agent").length, 2);
});

Deno.test("computePlan: IDE without agent support skips agents", async () => {
  const ide = makeIDE({ supportsAgents: false });
  const assets = makeAssets();

  const fsMock = {
    lstat: (_path: string) => {
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (_path: string): string => {
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  assertEquals(items.length, 2); // only skills
  assertEquals(items.every((i) => i.type === "skill"), true);
});

Deno.test("computePlan: existing correct symlink -> ok", async () => {
  const ide = makeIDE();
  const assets = makeAssets({ skills: ["flow-commit"], agents: [] });
  const targetPath = resolve(ide.configDir, "skills", "flow-commit");
  const expectedSource = resolve(FRAMEWORK_DIR, "skills", "flow-commit");

  const fsMock = {
    lstat: (path: string) => {
      if (path === targetPath) {
        return { isSymlink: true, isFile: false, isDirectory: false };
      }
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (path: string): string => {
      if (path === targetPath) {
        // Return absolute path; computePlan resolves relative links
        return expectedSource;
      }
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  assertEquals(items.length, 1);
  assertEquals(items[0].action, "ok");
});

Deno.test("computePlan: symlink to wrong target -> update", async () => {
  const ide = makeIDE();
  const assets = makeAssets({ skills: ["flow-commit"], agents: [] });
  const targetPath = resolve(ide.configDir, "skills", "flow-commit");

  const fsMock = {
    lstat: (path: string) => {
      if (path === targetPath) {
        return { isSymlink: true, isFile: false, isDirectory: false };
      }
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (path: string): string => {
      if (path === targetPath) {
        return "/some/other/path/flow-commit";
      }
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  assertEquals(items.length, 1);
  assertEquals(items[0].action, "update");
});

Deno.test("computePlan: real file at target -> conflict", async () => {
  const ide = makeIDE();
  const assets = makeAssets({ skills: [], agents: ["flow-commit.md"] });
  const targetPath = resolve(ide.configDir, "agents", "flow-commit.md");

  const fsMock = {
    lstat: (path: string) => {
      if (path === targetPath) {
        return { isSymlink: false, isFile: true, isDirectory: false };
      }
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (_path: string): string => {
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  assertEquals(items.length, 1);
  assertEquals(items[0].action, "conflict");
});

Deno.test("computePlan: stale symlink detected in skills dir", async () => {
  const ide = makeIDE();
  // Current framework has no skills — so any existing symlink pointing to frameworkDir is stale
  const assets = makeAssets({ skills: [], agents: [] });
  const staleTarget = resolve(ide.configDir, "skills", "flow-old");
  const staleSource = resolve(FRAMEWORK_DIR, "skills", "flow-old");

  const fsMock = {
    lstat: (path: string) => {
      if (path === staleTarget) {
        return { isSymlink: true, isFile: false, isDirectory: false };
      }
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (path: string): string => {
      if (path === staleTarget) {
        return staleSource;
      }
      throw new Error("not a symlink");
    },
    readDir: (path: string): AsyncIterable<Deno.DirEntry> => {
      const skillsDir = resolve(ide.configDir, "skills");
      if (path === skillsDir) {
        return {
          async *[Symbol.asyncIterator]() {
            yield {
              name: "flow-old",
              isFile: false,
              isDirectory: true,
              isSymlink: true,
            };
          },
        };
      }
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  const staleItems = items.filter((i) => i.action === "stale");
  assertEquals(staleItems.length, 1);
  assertEquals(staleItems[0].name, "flow-old");
});

Deno.test("computePlan: symlink to non-framework path is NOT stale", async () => {
  const ide = makeIDE();
  const assets = makeAssets({ skills: [], agents: [] });
  const externalTarget = resolve(ide.configDir, "skills", "user-skill");

  const fsMock = {
    lstat: (path: string) => {
      if (path === externalTarget) {
        return { isSymlink: true, isFile: false, isDirectory: false };
      }
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (path: string): string => {
      if (path === externalTarget) {
        return "/some/external/path/user-skill"; // not in frameworkDir
      }
      throw new Error("not a symlink");
    },
    readDir: (path: string): AsyncIterable<Deno.DirEntry> => {
      const skillsDir = resolve(ide.configDir, "skills");
      if (path === skillsDir) {
        return {
          async *[Symbol.asyncIterator]() {
            yield {
              name: "user-skill",
              isFile: false,
              isDirectory: true,
              isSymlink: true,
            };
          },
        };
      }
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  // Should produce no items — user's symlink is external, not our concern
  assertEquals(items.length, 0);
});

Deno.test("computePlan: broken parent symlink detected as replace_broken", async () => {
  const ide = makeIDE();
  const assets = makeAssets({ skills: ["flow-commit"], agents: [] });
  const skillsDir = resolve(ide.configDir, "skills");

  const fsMock = {
    lstat: (path: string) => {
      if (path === skillsDir) {
        // skills/ is a symlink (broken or not)
        return { isSymlink: true, isFile: false, isDirectory: false };
      }
      // Individual skill targets don't exist yet
      throw new Deno.errors.NotFound("not found");
    },
    readLink: (path: string): string => {
      if (path === skillsDir) {
        return "/old/broken/path/skills";
      }
      throw new Error("not a symlink");
    },
    readDir: (_path: string): AsyncIterable<Deno.DirEntry> => {
      return {
        async *[Symbol.asyncIterator]() {},
      };
    },
  };

  const items = await computePlan(ide, assets, fsMock);

  const replaceBroken = items.filter((i) => i.action === "replace_broken");
  assertEquals(replaceBroken.length, 1);
  assertEquals(replaceBroken[0].name, "skills/");
  assertEquals(replaceBroken[0].type, "dir");

  // Also should plan the skill as create
  const creates = items.filter((i) => i.action === "create");
  assertEquals(creates.length, 1);
  assertEquals(creates[0].name, "flow-commit");
});
