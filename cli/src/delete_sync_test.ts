import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { computeDeletePlan } from "./sync.ts";

Deno.test("computeDeletePlan - deletes excluded skill directory", async () => {
  const fs = new InMemoryFsAdapter();
  // Pre-existing skill directory
  fs.files.set("/project/.claude/skills/flow-skill-foo/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/flow-skill-foo");

  const plan = await computeDeletePlan(
    ["flow-skill-foo", "flow-skill-bar"],
    ["flow-skill-bar"], // only bar included
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flow-skill-foo");
  assertEquals(plan[0].action, "delete");
  assertEquals(plan[0].targetPath, "/project/.claude/skills/flow-skill-foo");
});

Deno.test("computeDeletePlan - deletes excluded agent file", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/agents/flow-agent-foo.md", "content");

  const plan = await computeDeletePlan(
    ["flow-agent-foo", "flow-agent-bar"],
    ["flow-agent-bar"],
    "/project/.claude/agents",
    "agent",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flow-agent-foo");
  assertEquals(plan[0].action, "delete");
  assertEquals(plan[0].targetPath, "/project/.claude/agents/flow-agent-foo.md");
});

Deno.test("computeDeletePlan - does not delete user resources", async () => {
  const fs = new InMemoryFsAdapter();
  // User resource not in framework bundle
  fs.files.set("/project/.claude/skills/my-custom-skill/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/my-custom-skill");

  const plan = await computeDeletePlan(
    ["flow-skill-foo"], // bundle only has flow-skill-foo
    [], // nothing included (empty = all included)
    "/project/.claude/skills",
    "skill",
    fs,
  );

  // No deletions — my-custom-skill is not in allFrameworkNames
  assertEquals(plan.length, 0);
});

Deno.test("computeDeletePlan - include mode deletes non-included framework resources", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/skills/flow-skill-a/SKILL.md", "a");
  fs.dirs.add("/project/.claude/skills/flow-skill-a");
  fs.files.set("/project/.claude/skills/flow-skill-b/SKILL.md", "b");
  fs.dirs.add("/project/.claude/skills/flow-skill-b");

  const plan = await computeDeletePlan(
    ["flow-skill-a", "flow-skill-b"],
    ["flow-skill-a"], // only A included → B should be deleted
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flow-skill-b");
  assertEquals(plan[0].action, "delete");
});

Deno.test("computeDeletePlan - idempotent when resource does not exist locally", async () => {
  const fs = new InMemoryFsAdapter();
  // No pre-existing files

  const plan = await computeDeletePlan(
    ["flow-skill-foo"],
    [], // all included, but foo excluded means includedNames would be empty only via exclude
    "/project/.claude/skills",
    "skill",
    fs,
  );

  // foo is in both all and included → not excluded → no deletion
  assertEquals(plan.length, 0);
});

Deno.test("computeDeletePlan - idempotent when excluded resource does not exist locally", async () => {
  const fs = new InMemoryFsAdapter();
  // No pre-existing files at all

  const plan = await computeDeletePlan(
    ["flow-skill-foo", "flow-skill-bar"],
    ["flow-skill-bar"], // foo excluded but doesn't exist locally
    "/project/.claude/skills",
    "skill",
    fs,
  );

  assertEquals(plan.length, 0);
});

Deno.test("writeFiles - handles delete action", async () => {
  const { writeFiles } = await import("./writer.ts");
  const fs = new InMemoryFsAdapter();
  fs.files.set("/project/.claude/skills/flow-skill-foo/SKILL.md", "content");
  fs.dirs.add("/project/.claude/skills/flow-skill-foo");

  const result = await writeFiles(
    [{
      type: "skill",
      name: "flow-skill-foo",
      action: "delete",
      sourcePath: "",
      targetPath: "/project/.claude/skills/flow-skill-foo",
      content: "",
    }],
    fs,
  );

  assertEquals(result.deleted, 1);
  assertEquals(result.written, 0);
  assertEquals(
    await fs.exists("/project/.claude/skills/flow-skill-foo"),
    false,
  );
  assertEquals(
    await fs.exists("/project/.claude/skills/flow-skill-foo/SKILL.md"),
    false,
  );
});

Deno.test("InMemoryFsAdapter.remove - recursive deletes directory contents", async () => {
  const fs = new InMemoryFsAdapter();
  fs.files.set("/a/b/c.txt", "c");
  fs.files.set("/a/b/d.txt", "d");
  fs.dirs.add("/a/b");
  fs.dirs.add("/a");

  await fs.remove("/a/b");

  assertEquals(fs.files.has("/a/b/c.txt"), false);
  assertEquals(fs.files.has("/a/b/d.txt"), false);
  assertEquals(fs.dirs.has("/a/b"), false);
  assertEquals(fs.dirs.has("/a"), true); // parent untouched
});
