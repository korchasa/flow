import { assertEquals, assertThrows } from "@std/assert";
import {
  buildClaudeArgs,
  formatStreamEvent,
  parseInterval,
  processNDJSONStream,
  type StreamEvent,
  StreamFormatter,
} from "./loop.ts";

// --- parseInterval ---

Deno.test("parseInterval - parses seconds", () => {
  assertEquals(parseInterval("30s"), 30_000);
});

Deno.test("parseInterval - parses minutes", () => {
  assertEquals(parseInterval("5m"), 300_000);
});

Deno.test("parseInterval - parses hours", () => {
  assertEquals(parseInterval("1h"), 3_600_000);
});

Deno.test("parseInterval - throws on invalid format", () => {
  assertThrows(() => parseInterval("abc"), Error);
});

Deno.test("parseInterval - throws on missing unit", () => {
  assertThrows(() => parseInterval("30"), Error);
});

Deno.test("parseInterval - throws on zero value", () => {
  assertThrows(() => parseInterval("0s"), Error);
});

// --- buildClaudeArgs ---

Deno.test("buildClaudeArgs - prompt only", () => {
  const args = buildClaudeArgs({ prompt: "hello world" });
  assertEquals(args, [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "hello world",
  ]);
});

Deno.test("buildClaudeArgs - agent mode", () => {
  const args = buildClaudeArgs({
    agent: "console-expert",
    prompt: "list files",
  });
  assertEquals(args, [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--agent",
    "console-expert",
    "list files",
  ]);
});

Deno.test("buildClaudeArgs - with model", () => {
  const args = buildClaudeArgs({ prompt: "test", model: "sonnet" });
  assertEquals(args, [
    "-p",
    "--model",
    "sonnet",
    "--output-format",
    "stream-json",
    "--verbose",
    "test",
  ]);
});

Deno.test("buildClaudeArgs - with cwd", () => {
  const args = buildClaudeArgs({ prompt: "test", cwd: "/tmp/project" });
  assertEquals(args, [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--cwd",
    "/tmp/project",
    "test",
  ]);
});

Deno.test("buildClaudeArgs - with yolo", () => {
  const args = buildClaudeArgs({ prompt: "test", yolo: true });
  assertEquals(args, [
    "-p",
    "--dangerously-skip-permissions",
    "--output-format",
    "stream-json",
    "--verbose",
    "test",
  ]);
});

Deno.test("buildClaudeArgs - all flags combined", () => {
  const args = buildClaudeArgs({
    agent: "expert",
    prompt: "fix",
    model: "opus",
    cwd: "/tmp",
    yolo: true,
  });
  assertEquals(args, [
    "-p",
    "--dangerously-skip-permissions",
    "--model",
    "opus",
    "--output-format",
    "stream-json",
    "--verbose",
    "--cwd",
    "/tmp",
    "--agent",
    "expert",
    "fix",
  ]);
});

// --- formatStreamEvent ---

Deno.test("formatStreamEvent - system/init with tools array", () => {
  const event: StreamEvent = {
    type: "system",
    subtype: "init",
    model: "claude-sonnet-4-20250514",
    tools: ["Read", "Write", "Bash"],
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[init]"), true);
  assertEquals(result.includes("claude-sonnet-4-20250514"), true);
  assertEquals(result.includes("3"), true);
});

Deno.test("formatStreamEvent - system/init with tools number (legacy)", () => {
  const event: StreamEvent = {
    type: "system",
    subtype: "init",
    model: "claude-sonnet-4-20250514",
    tools: 42,
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("42"), true);
});

Deno.test("formatStreamEvent - assistant text block (message.content)", () => {
  const event: StreamEvent = {
    type: "assistant",
    message: {
      content: [{ type: "text", text: "Let me check the code..." }],
    },
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[text]"), true);
  assertEquals(result.includes("Let me check the code..."), true);
});

Deno.test("formatStreamEvent - assistant tool_use block (message.content)", () => {
  const event: StreamEvent = {
    type: "assistant",
    message: {
      content: [{
        type: "tool_use",
        name: "Read",
        input: { file_path: "src/main.ts" },
      }],
    },
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[call]"), true);
  assertEquals(result.includes("Read"), true);
});

Deno.test("formatStreamEvent - user tool_result (message.content)", () => {
  const event: StreamEvent = {
    type: "user",
    message: {
      content: [{
        type: "tool_result",
        content: "import { foo } from './bar'",
      }],
    },
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[result]"), true);
  assertEquals(result.includes("ok"), true);
});

Deno.test("formatStreamEvent - result success", () => {
  const event: StreamEvent = {
    type: "result",
    subtype: "success",
    duration_ms: 12300,
    total_cost_usd: 0.045,
    num_turns: 5,
    is_error: false,
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[ok]"), true);
  assertEquals(result.includes("success"), true);
  assertEquals(result.includes("12.3s"), true);
  assertEquals(result.includes("$0.0450"), true);
  assertEquals(result.includes("turns=5"), true);
});

Deno.test("formatStreamEvent - result error", () => {
  const event: StreamEvent = {
    type: "result",
    subtype: "error",
    is_error: true,
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[error]"), true);
});

Deno.test("formatStreamEvent - system/task_started", () => {
  const event: StreamEvent = {
    type: "system",
    subtype: "task_started",
    description: "Find version in deno.json",
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[agent:start]"), true);
  assertEquals(result.includes("Find version"), true);
});

Deno.test("formatStreamEvent - system/task_progress", () => {
  const event: StreamEvent = {
    type: "system",
    subtype: "task_progress",
    description: "Reading deno.json",
    last_tool_name: "Read",
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[agent:call]"), true);
  assertEquals(result.includes("Read"), true);
});

Deno.test("formatStreamEvent - system/task_notification", () => {
  const event: StreamEvent = {
    type: "system",
    subtype: "task_notification",
    status: "completed",
    usage: { duration_ms: 2622, tool_uses: 3 },
  };
  const result = formatStreamEvent(event);
  assertEquals(result.includes("[agent:done]"), true);
  assertEquals(result.includes("completed"), true);
  assertEquals(result.includes("2.6s"), true);
  assertEquals(result.includes("tools=3"), true);
});

Deno.test("formatStreamEvent - unknown type returns empty", () => {
  const event: StreamEvent = { type: "unknown_type" };
  assertEquals(formatStreamEvent(event), "");
});

// --- StreamFormatter nesting ---

Deno.test("StreamFormatter - agent events are indented, orchestrator is not", () => {
  const fmt = new StreamFormatter();

  // Orchestrator call — no indent
  const call1 = fmt.format({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Agent", input: {} }] },
  });
  assertEquals(
    call1.startsWith("\x1b[33m[call]"),
    true,
    "orchestrator has no indent",
  );

  // Agent starts — depth becomes 1, indent = "  " (2 spaces)
  const start = fmt.format({
    type: "system",
    subtype: "task_started",
    description: "search",
  });
  assertEquals(start.startsWith("  \x1b[35m"), true, "agent:start indented");
  assertEquals(start.includes("[agent:start]"), true);

  // Tool call inside agent — indented
  const innerCall = fmt.format({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Read", input: {} }] },
  });
  assertEquals(innerCall.startsWith("  \x1b[33m"), true, "inner call indented");

  // Tool result inside agent — indented
  const innerResult = fmt.format({
    type: "user",
    message: { content: [{ type: "tool_result", content: "data" }] },
  });
  assertEquals(
    innerResult.startsWith("  \x1b[90m"),
    true,
    "inner result indented",
  );

  // Agent done — still indented, then depth drops
  const done = fmt.format({
    type: "system",
    subtype: "task_notification",
    status: "completed",
    usage: { duration_ms: 1000, tool_uses: 1 },
  });
  assertEquals(done.startsWith("  \x1b[35m"), true, "agent:done indented");

  // Back to orchestrator — no indent
  const text = fmt.format({
    type: "assistant",
    message: { content: [{ type: "text", text: "answer" }] },
  });
  assertEquals(text.startsWith("\x1b[37m[text]"), true, "back to no indent");
});

// --- processNDJSONStream ---

function makeStream(lines: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(lines.join("\n") + "\n");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  return stream.getReader();
}

Deno.test("processNDJSONStream - complete stream with result", async () => {
  const events: StreamEvent[] = [];
  const reader = makeStream([
    JSON.stringify({ type: "system", subtype: "init", model: "test" }),
    JSON.stringify({
      type: "assistant",
      content: [{ type: "text", text: "hi" }],
    }),
    JSON.stringify({ type: "result", subtype: "success", is_error: false }),
  ]);

  const result = await processNDJSONStream(reader, (e) => events.push(e));
  assertEquals(result.completed, true);
  assertEquals(result.success, true);
  assertEquals(events.length, 3);
  assertEquals(result.resultEvent?.type, "result");
});

Deno.test("processNDJSONStream - partial lines across chunks", async () => {
  const events: StreamEvent[] = [];
  const encoder = new TextEncoder();
  const line1 = JSON.stringify({ type: "system", subtype: "init" });
  const line2 = JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
  });

  // Split line2 in the middle to simulate partial chunks
  const full = line1 + "\n" + line2 + "\n";
  const mid = Math.floor(full.length / 2);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(full.slice(0, mid)));
      controller.enqueue(encoder.encode(full.slice(mid)));
      controller.close();
    },
  });

  const result = await processNDJSONStream(
    stream.getReader(),
    (e) => events.push(e),
  );
  assertEquals(result.completed, true);
  assertEquals(events.length, 2);
});

Deno.test("processNDJSONStream - malformed JSON lines skipped", async () => {
  const events: StreamEvent[] = [];
  const reader = makeStream([
    JSON.stringify({ type: "system" }),
    "this is not json",
    JSON.stringify({ type: "result", subtype: "success", is_error: false }),
  ]);

  const result = await processNDJSONStream(reader, (e) => events.push(e));
  assertEquals(result.completed, true);
  assertEquals(events.length, 2); // malformed line skipped
});

Deno.test("processNDJSONStream - stream without result event", async () => {
  const events: StreamEvent[] = [];
  const reader = makeStream([
    JSON.stringify({ type: "system" }),
    JSON.stringify({ type: "assistant", content: [] }),
  ]);

  const result = await processNDJSONStream(reader, (e) => events.push(e));
  assertEquals(result.completed, false);
  assertEquals(result.success, false);
  assertEquals(result.resultEvent, undefined);
});
