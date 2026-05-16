import * as vscode from 'vscode';
import type { EnumFinding, CommandLogEntry } from '../types/findings.js';
import type { HtbActiveMachine, HtbMachine } from '../types/htb.js';
import { maskSensitive } from '../utils/mask.js';
import { getAiHintLevel, getAiProvider, getAiContextMode } from '../utils/config.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type HintLevel = 'nudge' | 'tactic' | 'ttp' | 'poc';

export interface BoxContext {
  machine: HtbActiveMachine | null;
  machineInfo: HtbMachine | null;
  findings: ReadonlyArray<EnumFinding>;
  recentCommands: CommandLogEntry[];
}

// ─── Hint level system prompts ─────────────────────────────────────────────────

const HINT_LEVEL_PROMPTS: Record<HintLevel, string> = {
  nudge:
    'You are helping a learner solve a Hack The Box challenge. ' +
    'Ask a single guiding question that steers toward the next investigation area ' +
    'without revealing techniques or commands. One sentence only.',
  tactic:
    'You are helping a Hack The Box player. ' +
    'Suggest a high-level approach (e.g. "look at the authentication flow") ' +
    'without naming specific exploits or commands. Keep it brief.',
  ttp:
    'You are helping a Hack The Box player. ' +
    'Name relevant MITRE ATT&CK techniques or general attack patterns that apply, ' +
    'with brief reasoning. Do not provide working exploits or exact commands.',
  poc:
    'You are helping a Hack The Box player. ' +
    'Provide a concrete approach or example command that could help. ' +
    'Warn the user that this may spoil the box.',
};

// ─── Context builder ───────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 12_000;

export function buildContextPayload(ctx: BoxContext): string {
  const mode = getAiContextMode();
  const parts: string[] = [];

  if (ctx.machine) {
    const meta = [`Name: ${ctx.machine.name}`, `IP: ${ctx.machine.ip}`];
    if (ctx.machineInfo) {
      meta.push(`OS: ${ctx.machineInfo.os}`, `Difficulty: ${ctx.machineInfo.difficulty}`);
    }
    parts.push(`## Target\n${meta.join('\n')}`);
  }

  if (mode !== 'minimal' && ctx.findings.length > 0) {
    const byType = new Map<string, string[]>();
    for (const f of ctx.findings) {
      const list = byType.get(f.type) ?? [];
      list.push(f.value);
      byType.set(f.type, list);
    }
    const lines: string[] = ['## Enumeration Findings'];
    for (const [type, values] of byType) {
      lines.push(`### ${type}\n${values.join('\n')}`);
    }
    parts.push(lines.join('\n'));
  }

  if (mode === 'full-history' && ctx.recentCommands.length > 0) {
    const cmdLines = ctx.recentCommands
      .slice(-30)
      .map((c) => `$ ${c.command}${c.exitCode !== undefined ? ` [exit ${c.exitCode}]` : ''}`);
    parts.push(`## Recent Commands\n${cmdLines.join('\n')}`);
  }

  let payload = parts.join('\n\n');
  if (payload.length > MAX_CONTEXT_CHARS) {
    payload = payload.slice(0, MAX_CONTEXT_CHARS) + '\n\n[...truncated for token limit]';
  }
  return maskSensitive(payload);
}

// ─── AiService ─────────────────────────────────────────────────────────────────

export class AiService {
  async selectModel(): Promise<vscode.LanguageModelChat | undefined> {
    const provider = getAiProvider();
    if (provider === 'off') {
      return undefined;
    }

    const selector: vscode.LanguageModelChatSelector =
      provider === 'claude'
        ? { vendor: 'anthropic' }
        : provider === 'copilot'
          ? { vendor: 'copilot' }
          : {};

    const models = await vscode.lm.selectChatModels(selector);
    return models[0];
  }

  async ask(
    userPrompt: string,
    ctx: BoxContext,
    extensionContext: vscode.ExtensionContext,
  ): Promise<string | null> {
    const model = await this.selectModel();
    if (!model) {
      void vscode.window.showErrorMessage(
        'No AI model available. Install GitHub Copilot or the Claude VS Code extension.',
      );
      return null;
    }

    const hintLevel = getAiHintLevel() as HintLevel;
    const systemPrompt = HINT_LEVEL_PROMPTS[hintLevel] ?? HINT_LEVEL_PROMPTS.nudge;
    const contextPayload = buildContextPayload(ctx);
    const maskedPrompt = maskSensitive(userPrompt);

    const fullMessage = [systemPrompt, contextPayload, `User: ${maskedPrompt}`]
      .filter(Boolean)
      .join('\n\n');

    const confirmBeforeSend = vscode.workspace
      .getConfiguration('htb.ai')
      .get<boolean>('confirmBeforeSend', false);

    if (confirmBeforeSend) {
      const confirmed = await showConfirmSendPanel(extensionContext, fullMessage);
      if (!confirmed) {
        return null;
      }
    }

    const messages = [vscode.LanguageModelChatMessage.User(fullMessage)];
    const cts = new vscode.CancellationTokenSource();
    try {
      const response = await model.sendRequest(messages, {}, cts.token);
      let text = '';
      for await (const chunk of response.text) {
        text += chunk;
      }
      return text;
    } finally {
      cts.dispose();
    }
  }
}

// ─── Confirm-before-send Webview ───────────────────────────────────────────────

export async function showConfirmSendPanel(
  context: vscode.ExtensionContext,
  payload: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      'htb.ai.confirmSend',
      'Review AI Prompt',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    panel.webview.html = buildConfirmHtml(payload);
    panel.webview.onDidReceiveMessage(
      (msg: { command: string }) => {
        panel.dispose();
        resolve(msg.command === 'send');
      },
      undefined,
      context.subscriptions,
    );
    panel.onDidDispose(() => resolve(false), undefined, context.subscriptions);
  });
}

function buildConfirmHtml(payload: string): string {
  const escaped = payload.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:16px}
    pre{background:var(--vscode-textBlockQuote-background);border:1px solid var(--vscode-textBlockQuote-border);padding:12px;border-radius:4px;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow-y:auto}
    .actions{margin-top:16px;display:flex;gap:8px}
    button{padding:6px 16px;border:none;border-radius:3px;cursor:pointer;font-size:var(--vscode-font-size)}
    .send{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
    .send:hover{background:var(--vscode-button-hoverBackground)}
    .cancel{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
    .cancel:hover{background:var(--vscode-button-secondaryHoverBackground)}
  </style>
</head>
<body>
  <h2>Review content before sending to AI</h2>
  <p>Sensitive values (flags, passwords, SSH keys) have been masked.</p>
  <pre>${escaped}</pre>
  <div class="actions">
    <button class="send" onclick="send()">Send to AI</button>
    <button class="cancel" onclick="cancel()">Cancel</button>
  </div>
  <script>
    const vscode=acquireVsCodeApi();
    function send(){vscode.postMessage({command:'send'});}
    function cancel(){vscode.postMessage({command:'cancel'});}
  </script>
</body>
</html>`;
}
