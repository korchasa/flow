import { join } from "@std/path";

export type TraceSource = "agent" | "judge" | "user_emulation" | "system";

export interface TraceEvent {
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  content: string;
}

export class TraceLogger {
  private tracePath: string;
  private events: TraceEvent[] = [];
  private scenarioMetadata: {
    name: string;
    id: string;
    model: string;
    agentPath: string;
    userQuery: string;
    date: string;
  } | null = null;

  constructor(workDir: string) {
    this.tracePath = join(workDir, "trace.html");
  }

  private async save() {
    if (!this.scenarioMetadata) return;

    const html = this.render();
    await Deno.writeTextFile(this.tracePath, html);
  }

  private render(): string {
    const meta = this.scenarioMetadata!;

    // Simple HTML escaping
    const escape = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const eventsHtml = this.events
      .map((event) => {
        const title = event.metadata.description || event.type;
        const isLong = event.content.length > 800;
        const shouldCollapse = [
          "message",
          "interaction",
          "command",
          "tools_definition",
        ].includes(event.type) && isLong;

        let content = event.content;
        if (content.includes("%")) {
          try {
            content = decodeURIComponent(content);
          } catch {
            // If decoding fails, keep original content
          }
        }

        if (shouldCollapse) {
          return `
          <details class="event event-${event.type}">
            <summary>
              <span class="timestamp">${
            new Date(event.timestamp).toLocaleTimeString()
          }</span>
              <span class="type">${event.type}</span>
              <span class="title">${escape(String(title))} (Long)</span>
            </summary>
            <div class="content">${content}</div>
          </details>
        `;
        } else {
          return `
          <div class="event event-${event.type}">
            <div class="event-header">
              <span class="timestamp">${
            new Date(event.timestamp).toLocaleTimeString()
          }</span>
              <span class="type">${event.type}</span>
              <span class="title">${escape(String(title))}</span>
            </div>
            <div class="content">${content}</div>
          </div>
        `;
        }
      })
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Benchmark Trace: ${escape(meta.name)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #e1e1e1;
      background: #1e1e1e;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid #333;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    h1 { margin: 0; color: #fff; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
      font-size: 0.9em;
      color: #aaa;
    }
    .meta-item b { color: #ddd; }
    
    .event {
      background: #252526;
      border: 1px solid #333;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .event-header, summary {
      padding: 10px 15px;
      background: #2d2d2d;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    .timestamp { color: #888; font-family: monospace; font-size: 0.85em; }
    .type {
      text-transform: uppercase;
      font-size: 0.75em;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      background: #444;
    }
    .title { font-weight: 500; }
    .content { padding: 15px; border-top: 1px solid #333; overflow-x: auto; }
    
    pre { background: #000; padding: 10px; border-radius: 4px; }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    
    .event-interaction { border-left: 4px solid #007acc; }
    .event-command { border-left: 4px solid #4ec9b0; }
    .event-evaluation { border-left: 4px solid #ce9178; }
    .event-summary { border-left: 4px solid #6a9955; background: #2d3d2d; }
    
    .summary-card {
      background: #2d2d2d;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .metric-value { display: block; font-size: 1.5em; font-weight: bold; color: #fff; }
    .metric-label { font-size: 0.8em; color: #aaa; text-transform: uppercase; }
    
    details[open] summary { border-bottom: 1px solid #333; }
    
    /* Markdown-like styles for content */
    .content h2, .content h3 { margin-top: 0; }
    .content blockquote {
      border-left: 4px solid #444;
      margin: 0;
      padding-left: 15px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Benchmark Trace: ${escape(meta.name)}</h1>
      <div class="meta-grid">
        <div class="meta-item"><b>ID:</b> <code>${escape(meta.id)}</code></div>
        <div class="meta-item"><b>Model:</b> <code>${
      escape(meta.model)
    }</code></div>
        <div class="meta-item"><b>Date:</b> ${
      new Date(meta.date).toLocaleString()
    }</div>
        <div class="meta-item"><b>Agent:</b> <code>${
      escape(meta.agentPath)
    }</code></div>
      </div>
    </header>

    <div class="event event-context">
      <div class="event-header"><span class="title">Initial Query</span></div>
      <div class="content">
        <blockquote>${
      escape(meta.userQuery).replace(/\n/g, "<br>")
    }</blockquote>
      </div>
    </div>

    ${eventsHtml}
  </div>
</body>
</html>`;
  }

  async init(
    scenarioName: string,
    scenarioId: string,
    model: string,
    agentPath: string,
    userQuery: string,
  ) {
    this.scenarioMetadata = {
      name: scenarioName,
      id: scenarioId,
      model: model,
      agentPath: agentPath,
      userQuery: userQuery,
      date: new Date().toISOString(),
    };
    await this.save();
  }

  private addEvent(
    type: string,
    metadata: Record<string, unknown>,
    content: string,
  ) {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      metadata,
      content,
    });
  }

  async logLLMInteraction(
    messages: { role: string; content: string }[],
    response: string,
    context: { step: number; source: TraceSource; model?: string },
  ) {
    for (const msg of messages) {
      const isSystem = msg.role === "system";
      const description = isSystem ? "System Prompt" : "User Message";

      let content = msg.content;
      if (isSystem) {
        content =
          `<details><summary>System Prompt (Click to expand)</summary><pre><code>${
            escape(msg.content)
          }</code></pre></details>`;
      } else {
        content = `<pre><code>${escape(msg.content)}</code></pre>`;
      }

      this.addEvent("message", {
        role: msg.role,
        source: isSystem
          ? "system"
          : (msg.role === "user" ? "user_emulation" : "agent"),
        step: context.step,
        description,
      }, content);
    }

    this.addEvent("interaction", {
      source: context.source,
      step: context.step,
      model: context.model,
      description: "Model response",
    }, `<pre><code>${escape(response)}</code></pre>`);

    await this.save();
  }

  async logExecutionSection() {
    // No-op in HTML version as we use timeline
  }

  async logCommand(
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
    context?: { step: number },
  ) {
    let content = `<b>Command:</b> <code>${command}</code><br>`;
    content += `<b>Exit Code:</b> ${exitCode}<br>`;
    if (stdout.trim()) {
      content += `<b>Stdout:</b><pre><code>${stdout.trim()}</code></pre>`;
    }
    if (stderr.trim()) {
      content += `<b>Stderr:</b><pre><code>${stderr.trim()}</code></pre>`;
    }

    this.addEvent("command", {
      command,
      exit_code: exitCode,
      step: context?.step,
      source: "system",
      description: `Command: ${command}`,
    }, content);

    await this.save();
  }

  async logEvidence(gitStatus: string, gitLog: string) {
    let content =
      `<h3>Git Status</h3><pre><code>${gitStatus.trim()}</code></pre>`;
    content += `<h3>Git Log</h3><pre><code>${gitLog.trim()}</code></pre>`;

    this.addEvent("evidence", {
      source: "system",
      description: "Final state of the sandbox",
    }, content);

    await this.save();
  }

  async logEvaluation(
    checklistResults: Record<string, { pass: boolean; reason?: string }>,
    checklist: { id: string; description: string; critical: boolean }[],
    judgeInteraction?: {
      messages: { role: string; content: string }[];
      response: string;
    },
  ) {
    let content = "";

    if (judgeInteraction) {
      content += `<h3>Judge Interaction</h3>`;
      for (const msg of judgeInteraction.messages) {
        const isSystem = msg.role === "system";
        const description = isSystem
          ? "Judge System Prompt"
          : "Judge Input (Evidence)";
        const msgContent =
          `<details><summary>${description} (Click to expand)</summary><pre><code>${
            escape(msg.content)
          }</code></pre></details>`;

        content +=
          `<div class="event-message" style="margin-bottom: 10px;">${msgContent}</div>`;
      }
      content += `<h4>Judge Response</h4><pre><code>${
        escape(judgeInteraction.response)
      }</code></pre><hr>`;
    }

    content +=
      `<h3>Checklist Results</h3><ul style="list-style: none; padding: 0;">`;

    for (const item of checklist) {
      const res = checklistResults[item.id];
      const passed = res?.pass;
      const color = passed
        ? "#6a9955"
        : (item.critical ? "#f44336" : "#ff9800");
      const icon = passed ? "✓" : "✗";

      content +=
        `<li style="margin-bottom: 10px; padding: 10px; border-radius: 4px; background: #2d2d2d; border-left: 4px solid ${color}">
        <b style="color: ${color}">${icon} ${item.id}</b>: ${item.description}
        ${
          res?.reason
            ? `<br><i style="font-size: 0.9em; color: #aaa;">Reason: ${res.reason}</i>`
            : ""
        }
      </li>`;
    }
    content += `</ul>`;

    this.addEvent("evaluation", {
      source: "judge",
      description: "Judge's checklist results",
    }, content);

    await this.save();
  }

  async logSummary(
    result: {
      success: boolean;
      score: number;
      durationMs: number;
      tokensUsed: number;
    },
  ) {
    const statusColor = result.success ? "#6a9955" : "#f44336";
    const content = `
      <div class="summary-card">
        <div class="metric">
          <span class="metric-value" style="color: ${statusColor}">${
      result.success ? "PASSED" : "FAILED"
    }</span>
          <span class="metric-label">Result</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.score.toFixed(1)}%</span>
          <span class="metric-label">Score</span>
        </div>
        <div class="metric">
          <span class="metric-value">${
      (result.durationMs / 1000).toFixed(1)
    }s</span>
          <span class="metric-label">Duration</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.tokensUsed}</span>
          <span class="metric-label">Tokens</span>
        </div>
      </div>
    `;

    this.addEvent("summary", {
      source: "system",
      success: result.success,
      score: result.score,
      duration_ms: result.durationMs,
      tokens: result.tokensUsed,
      description: "Execution Summary",
    }, content);

    await this.save();
  }

  async logTools(toolsDescription: string) {
    this.addEvent("tools_definition", {
      source: "system",
      description: "Available tools",
    }, `<pre><code>${toolsDescription}</code></pre>`);

    await this.save();
  }
}
