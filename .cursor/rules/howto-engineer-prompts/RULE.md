---
description: Evaluate or write prompts
alwaysApply: false
---
## Howto evaluate and write prompts

### Executive Summary

This document outlines the fundamental physics of effective prompt engineering. 

### 1. Universal Principles

Across all architectures, four core pillars define effective prompting:

#### 1.1. Specificity & Clarity (The "No Ambiguity" Rule)
Models are probabilistic engines that default to the most likely (generic) response when inputs are vague. To combat this, replace subjective adjectives with objective constraints.

| Component | Vague / Less Effective | Specific / Effective |
| :--- | :--- | :--- |
| **Length** | "Keep it short" | "Compose a response between 150-200 words" |
| **Audience** | "Explain this" | "Explain this concept for a 10th-grade science student" |
| **Style** | "Be professional" | "Use a formal, direct tone suitable for a corporate executive report" |
| **Action** | "Give info about..." | "Summarize, extract, and compare key findings..." |

#### 1.2. Structural Formatting
Long blocks of text confuse attention mechanisms. Use distinct delimiters to separate instructions, context, and input data. This prevents "instruction drift" and injection attacks.
*   **Delimiters**: Use clearly distinct tokens to separate sections. Common standards include:
    *   **XML Tags (`<tag>`)**: Excellent for nesting and hierarchy (e.g., `<instructions>`, `<context>`, `<example>`).
    *   **Markdown (`#`, `###`)**: Good for high-level sectioning.
    *   **Special Characters**: Triple quotes (`"""`), dashed lines (`---`).
*   **Benefits**: Helps the model distinguish *what* to do (instructions) from *what* to process (data).

#### 1.3. Few-Shot Learning (Examples)
Providing 3-5 diverse "gold standard" examples (Input -> Desired Output) is the single most effective way to enforce format and style without fine-tuning.
*   **Consistency**: Examples must perfectly match the desired output format.
*   **Diversity**: Cover edge cases, not just the "happy path".
*   **Separation**: Clearly distinguish examples from the actual task.

#### 1.4. Role Prompting (Persona)
Assigning a specific persona (e.g., "Senior Python Backend Engineer" vs "Helpful Assistant") grounds the model's knowledge base and tone.
*   **Implementation**: Ideally placed in the **System Message** or at the very start of the prompt.
*   **Nuance**: Define *who* the model is, *who* the audience is, and *what* the constraints are.

#### 1.5. Positive Constraints
Models often struggle with negative constraints ("Don't do X") because the concept "X" is activated in the latent space.
*   **Technique**: Focus on *what to do* rather than *what not to do*.
*   **Example**: Instead of "Don't be verbose," use "Be concise and direct."

---

### 2. Advanced Techniques

#### 2.1. Chain of Thought (CoT) & Reasoning
For complex logic, math, or planning, output quality improves significantly when the model "shows its work" before the final answer.
*   **Manual CoT**: Append instructions like "Let's think step by step" or "Explain your reasoning before giving the answer."
*   **Structured CoT**: Instruct the model to output reasoning in specific tags (e.g., `<thinking>...</thinking>`) before the final `<answer>`.
*   **Native Reasoning**: Some advanced models have a "thinking" phase built-in. For these, simple prompts often work best as the model manages its own reasoning process.

#### 2.2. Retrieval Augmented Generation (RAG) Ordering
*   **"Lost in the Middle"**: Models pay the most attention to the beginning and end of the context window.
*   **Best Practice**: Place bulky context/documents at the **start**. Place the specific query/instruction at the **end**.
*   **Grounding**: Explicitly instruct the model to "Answer solely based on the provided text" to reduce hallucinations.

#### 2.3. Pre-filling (Response Priming)
You can guide the model's output by supplying the first few words of its response.
*   **Format Enforcement**: To force JSON, start the assistant's response with `{"`.
*   **Character Consistency**: To force a specific persona, start with `[Character Name]:`.
*   **Bypass Refusal/Fluff**: Skipping polite preambles (e.g., "Sure, I can help...") often leads to more direct, higher-quality technical outputs.

#### 2.4. Agentic Workflows
*   **Decomposition**: Break complex tasks (e.g., Research -> Outline -> Draft) into separate prompts/API calls rather than one massive instruction.
*   **Reflexion**: Ask the model to critique its own output before finalizing ("Review your code for bugs before outputting").

---

### 3. Evaluation & Engineering Process

Prompt engineering is an engineering discipline. It requires a systematic lifecycle:

1.  **Define Success (SMART)**: Specific, Measurable, Achievable, Relevant, Time-bound criteria.
2.  **Create Test Set**:
    *   **Common cases (80%)**: The standard inputs.
    *   **Edge cases (15%)**: Tricky, empty, or malformed inputs.
    *   **Adversarial cases (5%)**: Inputs designed to break instructions.
3.  **Evaluate**:
    *   **Deterministic**: Regex, substring match, JSON validation (for structure).
    *   **Model-based (LLM-as-a-Judge)**: Use a strong model to grade the output of the target model based on a rubric (for quality/tone).
4.  **Iterate**: Change *one* variable at a time (e.g., add an example, change the persona) and re-run the eval set.

---

### 4. Cheatsheet: The "Ingredient" Framework

Every robust prompt should contain these four components:

1.  **Goal**: What is the task? (Action verb: Summarize, Draft, Code)
2.  **Context**: Who is the user? What is the background? Why is this being done?
3.  **Source**: What data is being processed? (The input text/files, clearly delimited)
4.  **Expectations**: Output format (JSON, Table), tone, length constraints.
  