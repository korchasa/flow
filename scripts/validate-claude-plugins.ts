#!/usr/bin/env -S deno run -A
// Compatibility wrapper. Prefer scripts/validate-plugins.ts for new callers.

export * from "./validate-plugins.ts";

if (import.meta.main) {
  const command = new Deno.Command("deno", {
    args: ["run", "-A", "scripts/validate-plugins.ts", ...Deno.args],
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = command.spawn();
  const status = await child.status;
  Deno.exit(status.code);
}
