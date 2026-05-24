import { assertEquals, assertThrows } from "@std/assert";
import {
  autoInstallEnabled,
  ENV_AUTO_INSTALL_PLUGINS,
  parseAndStripFlowaiTables,
  parseArgs,
  planClaudeActions,
  readMarketplacePluginNames,
  reconcileCodexFlowaiPluginEntries,
} from "./sync-plugins-local.ts";

Deno.test("readMarketplacePluginNames: extracts sorted unique plugin names", () => {
  const json = JSON.stringify({
    name: "flowai-plugins",
    plugins: [
      { name: "flowai-engineering" },
      { name: "flowai" },
      { name: "flowai-deno" },
      { name: "flowai" },
    ],
  });
  assertEquals(readMarketplacePluginNames(json), [
    "flowai",
    "flowai-deno",
    "flowai-engineering",
  ]);
});

Deno.test("readMarketplacePluginNames: throws when plugins array is missing", () => {
  assertThrows(() =>
    readMarketplacePluginNames(JSON.stringify({ name: "flowai-plugins" }))
  );
});

Deno.test("readMarketplacePluginNames: throws when marketplace declares zero plugins", () => {
  // Refusal-to-wipe guard: an empty list would silently nuke the user's
  // Codex flowai entries if it propagated to reconcileCodexFlowaiPluginEntries.
  assertThrows(() =>
    readMarketplacePluginNames(
      JSON.stringify({ name: "flowai-plugins", plugins: [] }),
    )
  );
});

Deno.test("planClaudeActions: every emitted plugin goes to install, disabled stays skipped", () => {
  const plan = planClaudeActions(
    ["flowai", "flowai-deno", "flowai-memex", "flowai-typescript"],
    [
      { id: "flowai@flowai-plugins", scope: "user", enabled: true },
      { id: "flowai-deno@flowai-plugins", scope: "user", enabled: false },
      { id: "flowai-memex@flowai-plugins", scope: "user", enabled: true },
    ],
  );
  assertEquals(plan.install, [
    "flowai@flowai-plugins",
    "flowai-memex@flowai-plugins",
    "flowai-typescript@flowai-plugins",
  ]);
  assertEquals(plan.skipped, ["flowai-deno@flowai-plugins"]);
});

Deno.test("planClaudeActions: ignores project-scope and other-marketplace disabled entries", () => {
  const plan = planClaudeActions(
    ["flowai"],
    [
      { id: "flowai@flowai-plugins", scope: "project", enabled: false },
      { id: "flowai@other-marketplace", scope: "user", enabled: false },
    ],
  );
  // Neither entry matches `<x>@flowai-plugins` at user scope → no skip.
  assertEquals(plan.install, ["flowai@flowai-plugins"]);
  assertEquals(plan.skipped, []);
});

Deno.test("parseAndStripFlowaiTables: removes 2-line blocks and records enabled state", () => {
  const text = `[plugins."foreign@other-marketplace"]
enabled = true

[plugins."flowai-core@flowai-plugins"]
enabled = true

[plugins."flowai-deno@flowai-plugins"]
enabled = false

[projects."/tmp/x"]
trust_level = "trusted"
`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(
    stripped.includes('[plugins."flowai-core@flowai-plugins"]'),
    false,
  );
  assertEquals(
    stripped.includes('[plugins."flowai-deno@flowai-plugins"]'),
    false,
  );
  assertEquals(
    stripped.includes('[plugins."foreign@other-marketplace"]'),
    true,
  );
  assertEquals(stripped.includes('[projects."/tmp/x"]'), true);
  assertEquals(previousEnabled.get("flowai-core"), true);
  assertEquals(previousEnabled.get("flowai-deno"), false);
});

Deno.test("parseAndStripFlowaiTables: handles CRLF line endings", () => {
  const text =
    `[plugins."flowai@flowai-plugins"]\r\nenabled = true\r\n\r\n[plugins."foreign@other"]\r\nenabled = true\r\n`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(stripped.includes('[plugins."flowai@flowai-plugins"]'), false);
  assertEquals(stripped.includes('[plugins."foreign@other"]'), true);
  assertEquals(previousEnabled.get("flowai"), true);
});

Deno.test("parseAndStripFlowaiTables: tolerates trailing whitespace and inline comments on enabled line", () => {
  const text = `[plugins."flowai@flowai-plugins"]
enabled = false   # pinned-off
extra_key = "value"

[next-section]
`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(stripped.includes('[plugins."flowai@flowai-plugins"]'), false);
  assertEquals(stripped.includes("extra_key"), false);
  assertEquals(stripped.includes("[next-section]"), true);
  assertEquals(previousEnabled.get("flowai"), false);
});

Deno.test("parseAndStripFlowaiTables: tables with extra keys are consumed entirely", () => {
  const text = `[plugins."flowai@flowai-plugins"]
enabled = true
version = "1.0"
custom = "x"

[unrelated]
key = 1
`;
  const { stripped } = parseAndStripFlowaiTables(text);
  assertEquals(stripped.includes('[plugins."flowai@flowai-plugins"]'), false);
  assertEquals(stripped.includes("version"), false);
  assertEquals(stripped.includes('custom = "x"'), false);
  assertEquals(stripped.includes("[unrelated]"), true);
});

Deno.test("parseAndStripFlowaiTables: file ending without trailing newline still parses", () => {
  const text =
    `[other]\nkey = 1\n\n[plugins."flowai@flowai-plugins"]\nenabled = true`;
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(text);
  assertEquals(stripped.includes('[plugins."flowai@flowai-plugins"]'), false);
  assertEquals(stripped.includes("[other]"), true);
  assertEquals(previousEnabled.get("flowai"), true);
});

Deno.test("reconcileCodexFlowaiPluginEntries: preserves enabled=false across reconcile", () => {
  const original = `[plugins."flowai-memex@flowai-plugins"]
enabled = false

[plugins."flowai@flowai-plugins"]
enabled = true
`;
  const next = reconcileCodexFlowaiPluginEntries(original, [
    "flowai",
    "flowai-memex",
    "flowai-typescript",
  ]);
  assertEquals(
    next.includes('[plugins."flowai-memex@flowai-plugins"]\nenabled = false'),
    true,
    "previously-disabled plugin must keep enabled=false",
  );
  assertEquals(
    next.includes('[plugins."flowai@flowai-plugins"]\nenabled = true'),
    true,
  );
  assertEquals(
    next.includes(
      '[plugins."flowai-typescript@flowai-plugins"]\nenabled = true',
    ),
    true,
    "newly-emitted plugin defaults to enabled=true",
  );
});

Deno.test("reconcileCodexFlowaiPluginEntries: CRLF-encoded input does not produce duplicate tables", () => {
  const original =
    `[plugins."flowai@flowai-plugins"]\r\nenabled = true\r\n\r\n[other]\r\nkey = 1\r\n`;
  const next = reconcileCodexFlowaiPluginEntries(original, ["flowai"]);
  const occurrences = next.match(/\[plugins\."flowai@flowai-plugins"\]/g) ?? [];
  assertEquals(
    occurrences.length,
    1,
    "exactly one flowai-plugins table after reconcile",
  );
});

Deno.test("reconcileCodexFlowaiPluginEntries: idempotent across repeated runs", () => {
  const original = `[plugins."flowai-core@flowai-plugins"]
enabled = true
`;
  const once = reconcileCodexFlowaiPluginEntries(original, [
    "flowai",
    "flowai-deno",
  ]);
  const twice = reconcileCodexFlowaiPluginEntries(once, [
    "flowai",
    "flowai-deno",
  ]);
  assertEquals(once, twice);
});

Deno.test("reconcileCodexFlowaiPluginEntries: throws on empty emittedNames", () => {
  assertThrows(
    () => reconcileCodexFlowaiPluginEntries("[other]\nkey = 1\n", []),
    Error,
    "refusing to reconcile",
  );
});

Deno.test("parseArgs: --out without value fails fast", () => {
  assertThrows(() => parseArgs(["--out"]), Error, "--out requires");
  assertThrows(
    () => parseArgs(["--out", "--no-build"]),
    Error,
    "--out requires",
  );
});

Deno.test("parseArgs: accepts valid --out and --no-build", () => {
  assertEquals(parseArgs(["--out", "tmp/dist"]), {
    outDir: "tmp/dist",
    skipBuild: false,
  });
  assertEquals(parseArgs(["--no-build"]), {
    outDir: "dist/claude-plugins",
    skipBuild: true,
  });
});

Deno.test("autoInstallEnabled: reads explicit true from dotenv content", () => {
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=true\n`),
    true,
  );
});

Deno.test("autoInstallEnabled: only exact true enables auto-install", () => {
  assertEquals(autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=1\n`), false);
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=false\n`),
    false,
  );
  assertEquals(autoInstallEnabled("AUTO_INSTALL_PLPUGINS=true\n"), false);
});
