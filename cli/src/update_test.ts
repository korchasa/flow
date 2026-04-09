import { assertEquals } from "@std/assert";
import { runSelfUpdate } from "./update.ts";

const CURRENT = "0.5.0";

function mockCheck(latest: string) {
  return (_v: string) =>
    Promise.resolve({
      currentVersion: CURRENT,
      latestVersion: latest,
      updateAvailable: latest > CURRENT,
      updateCommand: `deno install -g -A -f jsr:@korchasa/flowai@${latest}`,
    });
}

function mockCheckNull() {
  return (_v: string) => Promise.resolve(null);
}

function mockInstall(success: boolean) {
  return (_version: string) => Promise.resolve(success);
}

Deno.test("runSelfUpdate - skip: true returns false without checking", async () => {
  let checked = false;
  const result = await runSelfUpdate({
    skip: true,
    checkFn: (_v) => {
      checked = true;
      return Promise.resolve(null);
    },
  });
  assertEquals(result, false);
  assertEquals(checked, false);
});

Deno.test("runSelfUpdate - already up to date returns false", async () => {
  const messages: string[] = [];
  const result = await runSelfUpdate({
    currentVersion: CURRENT,
    checkFn: mockCheck(CURRENT),
    log: (m) => messages.push(m),
  });
  assertEquals(result, false);
  assertEquals(messages.some((m) => m.includes("Already up to date")), true);
});

Deno.test("runSelfUpdate - network error returns false with message", async () => {
  const messages: string[] = [];
  const result = await runSelfUpdate({
    currentVersion: CURRENT,
    checkFn: mockCheckNull(),
    log: (m) => messages.push(m),
  });
  assertEquals(result, false);
  assertEquals(messages.some((m) => m.includes("Could not check")), true);
});

Deno.test("runSelfUpdate - yes mode: update available prints command, returns false", async () => {
  const messages: string[] = [];
  const result = await runSelfUpdate({
    yes: true,
    currentVersion: CURRENT,
    checkFn: mockCheck("0.6.0"),
    log: (m) => messages.push(m),
  });
  assertEquals(result, false);
  assertEquals(messages.some((m) => m.includes("Run:")), true);
  assertEquals(messages.some((m) => m.includes("0.6.0")), true);
});

Deno.test("runSelfUpdate - interactive: user confirms, update succeeds, returns true", async () => {
  const messages: string[] = [];
  const result = await runSelfUpdate({
    currentVersion: CURRENT,
    checkFn: mockCheck("0.6.0"),
    installFn: mockInstall(true),
    promptFn: (_msg) => Promise.resolve(true),
    log: (m) => messages.push(m),
  });
  assertEquals(result, true);
  assertEquals(messages.some((m) => m.includes("Updated to 0.6.0")), true);
});

Deno.test("runSelfUpdate - interactive: user declines, returns false", async () => {
  const result = await runSelfUpdate({
    currentVersion: CURRENT,
    checkFn: mockCheck("0.6.0"),
    installFn: mockInstall(true),
    promptFn: (_msg) => Promise.resolve(false),
    log: () => {},
  });
  assertEquals(result, false);
});

Deno.test("runSelfUpdate - interactive: install fails, returns false", async () => {
  const messages: string[] = [];
  const result = await runSelfUpdate({
    currentVersion: CURRENT,
    checkFn: mockCheck("0.6.0"),
    installFn: mockInstall(false),
    promptFn: (_msg) => Promise.resolve(true),
    log: (m) => messages.push(m),
  });
  assertEquals(result, false);
});
