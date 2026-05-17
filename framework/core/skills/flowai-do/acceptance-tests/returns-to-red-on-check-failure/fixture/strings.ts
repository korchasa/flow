// Pre-seeded lint violation — `unused` is exported but never used internally,
// and the agent's plan-driven changes do not consume it either. The lint
// rule (`no-unused-vars` / `verbatim-module-syntax`) flags it; the agent
// must fix the source (remove the unused symbol) rather than disable lint.
import { join as _unusedJoin } from "@std/path";

/** Capitalize the first character of a string. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}
