import { chatCompletion } from "./llm.ts";
import { BenchmarkChecklistItem, LLMMessage } from "./types.ts";

export async function evaluateChecklist(
  userQuery: string,
  agentLogs: string,
  fileDiffs: string,
  checklist: BenchmarkChecklistItem[],
): Promise<Record<string, { pass: boolean; reason: string }>> {
  const checklistJson = JSON.stringify(
    checklist.map((c) => ({ id: c.id, description: c.description })),
    null,
    2,
  );

  const systemPrompt = `
You are an impartial automated auditor.
Your job is to verify if an AI Agent followed instructions based on a strict checklist.

CONTEXT:
User Query:
${userQuery}

Agent Output/Actions (Logs):
${agentLogs}

File Changes (Diffs):
${fileDiffs}

CHECKLIST:
${checklistJson}

INSTRUCTIONS:
1. Analyze the Context against each item in the Checklist.
2. For each item, provide a "reason" explaining your finding, and then a strict "pass" (boolean).
3. Output ONLY a valid JSON object mapping the checklist item 'id' to an object with 'reason' (string) and 'pass' (boolean).
4. Do NOT output markdown formatting (like \`\`\`json), just the raw JSON string.

EXAMPLE OUTPUT:
{
  "check_id_1": {
    "reason": "The agent executed the command correctly.",
    "pass": true
  },
  "check_id_2": {
    "reason": "The agent failed to update the file.",
    "pass": false
  }
}
`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Evaluate the agent performance now." },
  ];

  try {
    // Using a slightly smarter model for judging if needed, but flash is usually good for this
    const response = await chatCompletion(
      messages,
      "google/gemini-2.0-flash-001",
      0,
    );

    // Clean up potential markdown code blocks
    let cleanContent = response.content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/^```json/, "").replace(/```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```/, "").replace(/```$/, "");
    }

    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("Error in Judge evaluation:", error);
    // Return all false if judge fails, to be safe
    const fallback: Record<string, { pass: boolean; reason: string }> = {};
    for (const item of checklist) {
      fallback[item.id] = { pass: false, reason: "Judge evaluation failed" };
    }
    return fallback;
  }
}
