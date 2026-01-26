import { assertEquals } from "@std/assert";
import { chatCompletion } from "./llm.ts";

Deno.test("LLM - chatCompletion should use config object and include provider", async () => {
  let capturedBody: Record<string, unknown> = {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => {
    // @ts-ignore: init.body exists on RequestInit in Deno/Web API
    capturedBody = JSON.parse(init?.body as string);
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Hello" } }],
          usage: { total_tokens: 10 },
        }),
    } as Response);
  };

  try {
    Deno.env.set("OPENROUTER_API_KEY", "test-key");
    const config = {
      model: "test-model",
      temperature: 0.7,
      provider: { order: ["TestProvider"] },
      extra: "param",
    };

    // @ts-ignore: testing with extra params
    await chatCompletion([{ role: "user", content: "Hi" }], config);

    assertEquals(capturedBody.model, "test-model");
    assertEquals(capturedBody.temperature, 0.7);
    assertEquals((capturedBody.provider as Record<string, unknown>).order, [
      "TestProvider",
    ]);
    assertEquals(capturedBody.extra, "param");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
