// Pre-seeded lint violation — `join` is imported but never used. The Deno
// `no-unused-vars` rule flags this (NOT suppressed because there's no `_`
// prefix). The agent must fix the source (remove the import) rather than
// disable lint.
import { join } from "@std/path";

/** Capitalize the first character of a string. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}
