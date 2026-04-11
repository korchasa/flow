import { assertEquals } from "@std/assert";
import { buildJudgeMessages, parseJudgeVerdict } from "./judge.ts";

Deno.test("buildJudgeMessages: includes rule, query, and output", () => {
  const msgs = buildJudgeMessages({
    rule: "Always say banana.",
    userQuery: "Hello.",
    agentOutput: "Hi! banana.",
  });
  const joined = msgs.map((m) => m.content).join("\n");
  if (!joined.includes("Always say banana.")) {
    throw new Error("rule missing from judge messages");
  }
  if (!joined.includes("Hi! banana.")) {
    throw new Error("agent output missing");
  }
  if (!joined.includes("Hello.")) {
    throw new Error("user query missing");
  }
});

Deno.test("buildJudgeMessages: has system + user message", () => {
  const msgs = buildJudgeMessages({
    rule: "r",
    userQuery: "q",
    agentOutput: "a",
  });
  const system = msgs.filter((m) => m.role === "system");
  const user = msgs.filter((m) => m.role === "user");
  assertEquals(system.length, 1);
  assertEquals(user.length, 1);
});

Deno.test("parseJudgeVerdict: parses pass + reason", () => {
  const raw = JSON.stringify({ pass: true, reason: "Satisfied the rule." });
  const v = parseJudgeVerdict(raw);
  assertEquals(v.pass, true);
  assertEquals(v.reason, "Satisfied the rule.");
});

Deno.test("parseJudgeVerdict: parses fail verdict", () => {
  const raw = JSON.stringify({ pass: false, reason: "Missing marker." });
  const v = parseJudgeVerdict(raw);
  assertEquals(v.pass, false);
});

Deno.test("parseJudgeVerdict: tolerates text wrapper around JSON", () => {
  const raw = 'Verdict: {"pass": true, "reason": "ok"} end.';
  const v = parseJudgeVerdict(raw);
  assertEquals(v.pass, true);
});

Deno.test("parseJudgeVerdict: throws on malformed input", () => {
  let threw = false;
  try {
    parseJudgeVerdict("not json");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected parseJudgeVerdict to throw");
});
