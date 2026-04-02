import { assertEquals } from "@std/assert";
import { generateNotes, parseCommit } from "./generate-release-notes.ts";

Deno.test("parseCommit - with scope", () => {
  const result = parseCommit("feat(core): add new feature");
  assertEquals(result, { scope: "core", description: "add new feature" });
});

Deno.test("parseCommit - without scope", () => {
  const result = parseCommit("fix: resolve crash");
  assertEquals(result, { scope: "", description: "resolve crash" });
});

Deno.test("parseCommit - multi-scope", () => {
  const result = parseCommit("feat(cli,update): sync output");
  assertEquals(result, { scope: "cli,update", description: "sync output" });
});

Deno.test("parseCommit - non-conventional", () => {
  const result = parseCommit("Merge branch 'main'");
  assertEquals(result, null);
});

Deno.test("generateNotes - groups by category", () => {
  const subjects = [
    "feat(core): add feature A",
    "fix(cli): resolve bug B",
    "chore(release): 1.0.0",
    "refactor(core): clean up code",
    "Merge branch 'main'",
  ];

  const notes = generateNotes(subjects, "v0.1.0", "v0.2.0", "owner/repo");

  assertEquals(notes.includes("### Features"), true);
  assertEquals(notes.includes("- **core**: add feature A"), true);
  assertEquals(notes.includes("### Bug Fixes"), true);
  assertEquals(notes.includes("- **cli**: resolve bug B"), true);
  assertEquals(notes.includes("### Refactoring"), true);
  assertEquals(notes.includes("chore(release)"), false);
  assertEquals(notes.includes("Merge"), false);
  assertEquals(
    notes.includes(
      "**Full Changelog**: https://github.com/owner/repo/compare/v0.1.0...v0.2.0",
    ),
    true,
  );
});

Deno.test("generateNotes - empty commits", () => {
  const notes = generateNotes([], "v0.1.0", "v0.2.0", "owner/repo");
  assertEquals(notes.includes("## What's Changed"), true);
  assertEquals(notes.includes("**Full Changelog**"), true);
});
