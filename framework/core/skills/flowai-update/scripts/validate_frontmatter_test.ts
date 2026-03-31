import { assertEquals } from "jsr:@std/assert";
import {
  validateAgentFrontmatter,
  validateSkillFrontmatter,
} from "./validate_frontmatter.ts";

// --- Skill frontmatter ---

Deno.test("validateSkillFrontmatter - valid skill", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "A useful skill",
  });
  assertEquals(errors, []);
});

Deno.test("validateSkillFrontmatter - missing name", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - missing description", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "description");
});

Deno.test("validateSkillFrontmatter - name mismatch", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "other-skill",
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - invalid name format", () => {
  const errors = validateSkillFrontmatter("My_Skill", {
    name: "My_Skill",
    description: "A useful skill",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateSkillFrontmatter - optional disable-model-invocation", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "A useful skill",
    "disable-model-invocation": true,
  });
  assertEquals(errors, []);
});

// --- Agent frontmatter ---

Deno.test("validateAgentFrontmatter - valid agent", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "my-agent",
    description: "A useful agent",
  });
  assertEquals(errors, []);
});

Deno.test("validateAgentFrontmatter - missing name", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    description: "A useful agent",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});

Deno.test("validateAgentFrontmatter - with optional fields", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "my-agent",
    description: "A useful agent",
    tools: "Read,Write,Bash",
    mode: "subagent",
  });
  assertEquals(errors, []);
});

Deno.test("validateAgentFrontmatter - name mismatch", () => {
  const errors = validateAgentFrontmatter("my-agent", {
    name: "other-agent",
    description: "A useful agent",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].field, "name");
});
