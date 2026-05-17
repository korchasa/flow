/**
 * Tests for scripts/generate-skill-composites.ts (FR-SKILL-COMPOSE).
 *
 * Commit-1 scope: manifest loading + empty-manifest no-op. Commit-2+ extends
 * with atom render / param substitution / composite render / canon tests.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";

import {
  diffAgainstDisk,
  loadManifest,
  type Manifest,
  MANIFEST_PATH,
  renderAll,
} from "./generate-skill-composites.ts";

async function withTempManifest<T>(
  yaml: string,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  const dir = await Deno.makeTempDir({ prefix: "flowai-generate-test-" });
  try {
    const path = join(dir, "composites.yaml");
    await Deno.writeTextFile(path, yaml);
    return await fn(path);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("manifest_loads: parses schema_version + empty atoms/composites", async () => {
  const yaml = "schema_version: 1\natoms: {}\ncomposites: {}\n";
  await withTempManifest(yaml, async (path) => {
    const m = await loadManifest(path);
    assertEquals(m.schema_version, 1);
    assertEquals(Object.keys(m.atoms).length, 0);
    assertEquals(Object.keys(m.composites).length, 0);
  });
});

Deno.test("manifest_loads: real framework manifest parses", async () => {
  const m = await loadManifest(MANIFEST_PATH);
  assertEquals(m.schema_version, 1);
});

Deno.test("empty_manifest_no_op: renderAll returns []", async () => {
  const empty: Manifest = { schema_version: 1, atoms: {}, composites: {} };
  const out = await renderAll(empty);
  assertEquals(out, []);
});

Deno.test("empty_manifest_no_op: diffAgainstDisk on [] returns []", async () => {
  const drifts = await diffAgainstDisk([]);
  assertEquals(drifts, []);
});

Deno.test("malformed_manifest_fails_with_clear_message: bad YAML", async () => {
  await withTempManifest(
    "schema_version: 1\natoms: {{",
    (path) =>
      assertRejects(
        () => loadManifest(path),
        Error,
        "malformed YAML",
      ),
  );
});

Deno.test("malformed_manifest_fails_with_clear_message: missing schema_version", async () => {
  await withTempManifest("atoms: {}\ncomposites: {}\n", (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "schema_version",
    ));
});

Deno.test("malformed_manifest_fails_with_clear_message: unsupported schema_version", async () => {
  await withTempManifest(
    "schema_version: 99\natoms: {}\ncomposites: {}\n",
    (path) =>
      assertRejects(
        () => loadManifest(path),
        Error,
        "unsupported schema_version",
      ),
  );
});

Deno.test("manifest_loads: composite phase must specify atom XOR inline", async () => {
  const yaml = `schema_version: 1
atoms: {}
composites:
  foo:
    target: framework/core/commands/foo/SKILL.md
    wrapper: framework/core/commands/foo/_composite.md
    phases:
      - title: P
`;
  await withTempManifest(yaml, (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "exactly one of 'atom:' or 'inline: true'",
    ));
});

Deno.test("manifest_loads: composite must reference an existing atom", async () => {
  const yaml = `schema_version: 1
atoms: {}
composites:
  foo:
    target: framework/core/commands/foo/SKILL.md
    wrapper: framework/core/commands/foo/_composite.md
    phases:
      - title: P
        atom: nonexistent
`;
  await withTempManifest(yaml, (path) =>
    assertRejects(
      () => loadManifest(path),
      Error,
      "unknown atom 'nonexistent'",
    ));
});
