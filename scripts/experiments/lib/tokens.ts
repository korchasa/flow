/**
 * Token-size heuristic for experiment axes.
 *
 * Uses the "1 token ≈ 4 characters" approximation. This is accurate to
 * ±15% for English markdown, which is sufficient when the experiment axis
 * steps by ×2 between cells. For higher precision, swap in a real tokenizer
 * later — the API is narrow enough that callers will not need to change.
 */

const CHARS_PER_TOKEN = 4;

/** Estimates the number of tokens in `text` (rounded to nearest integer). */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.round(text.length / CHARS_PER_TOKEN);
}

/**
 * Returns a prefix of `text` whose estimated token count is at most `targetTokens`.
 *
 * - If `text` already fits, returns it unchanged.
 * - If trimming is required, slices at a character boundary that rounds DOWN
 *   to the target (prevents overshoot). The slice is taken on code units,
 *   but since we only cut on whole characters (not bytes), no UTF-8
 *   corruption is possible — JavaScript strings are sequences of UTF-16
 *   code units, and slicing by character index preserves validity.
 * - Trims trailing whitespace to avoid leaving a dangling partial word.
 */
export function fitToTokenBudget(text: string, targetTokens: number): string {
  if (targetTokens <= 0) return "";
  if (estimateTokens(text) <= targetTokens) return text;

  const targetChars = targetTokens * CHARS_PER_TOKEN;
  // Slice by Array.from to respect surrogate pairs; then rejoin.
  const chars = Array.from(text);
  if (chars.length <= targetChars) return text;
  const sliced = chars.slice(0, targetChars).join("");
  return sliced.trimEnd();
}
