import * as vscode from 'vscode';
import { AiService, buildContextPayload } from '../services/ai.js';
import type { BoxContext } from '../services/ai.js';
import type { EnumerationProvider } from '../views/enumPanel.js';
import type { ActiveMachineProvider } from '../views/machinesTree.js';
import type { CommandHistoryService } from '../services/commandHistory.js';
import type { HtbApiClient } from '../services/htbApi.js';
import type { Logger } from '../utils/logger.js';

export function registerAiCommands(
  context: vscode.ExtensionContext,
  aiService: AiService,
  enumProvider: EnumerationProvider,
  activeMachineProvider: ActiveMachineProvider,
  commandHistory: CommandHistoryService,
  apiClient: HtbApiClient,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('htb.ai.suggestNext', async () => {
      const ctx = await buildBoxContext(
        activeMachineProvider,
        enumProvider,
        commandHistory,
        apiClient,
      );
      const prompt =
        'Based on the current enumeration findings and commands already run, ' +
        'what should I investigate next?';
      await runAiQuery(prompt, ctx, aiService, context, logger);
    }),

    vscode.commands.registerCommand('htb.ai.analyzeOutput', async () => {
      const editor = vscode.window.activeTextEditor;
      const selected = editor?.document.getText(editor.selection) ?? '';
      let clipText = '';
      try {
        clipText = await vscode.env.clipboard.readText();
      } catch {
        clipText = '';
      }
      const text = selected.trim() || clipText;
      if (!text.trim()) {
        void vscode.window.showWarningMessage(
          'Select text in the editor or copy tool output to clipboard first.',
        );
        return;
      }
      const ctx = await buildBoxContext(
        activeMachineProvider,
        enumProvider,
        commandHistory,
        apiClient,
      );
      const prompt = `Analyze the following tool output and describe any interesting findings:\n\n${text}`;
      await runAiQuery(prompt, ctx, aiService, context, logger);
    }),

    vscode.commands.registerCommand('htb.ai.askContext', async () => {
      const question = await vscode.window.showInputBox({
        title: 'Ask about current box',
        prompt: 'What do you want to know?',
        ignoreFocusOut: true,
      });
      if (!question) {
        return;
      }
      const ctx = await buildBoxContext(
        activeMachineProvider,
        enumProvider,
        commandHistory,
        apiClient,
      );
      await runAiQuery(question, ctx, aiService, context, logger);
    }),

    vscode.commands.registerCommand('htb.ai.setHintLevel', async () => {
      const levels = [
        { label: 'nudge', description: 'Guiding question only — no techniques revealed' },
        { label: 'tactic', description: 'High-level approach without specific exploits' },
        { label: 'ttp', description: 'MITRE ATT&CK techniques with brief reasoning' },
        { label: 'poc', description: 'Concrete PoC / command — may spoil the box' },
      ];
      const pick = await vscode.window.showQuickPick(levels, {
        title: 'Set AI Hint Level',
        placeHolder: 'Select how explicit AI hints should be',
      });
      if (!pick) {
        return;
      }
      await vscode.workspace
        .getConfiguration('htb.ai')
        .update('hintLevel', pick.label, vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage(`AI hint level set to: ${pick.label}`);
      logger.info(`AI hint level changed to: ${pick.label}`);
    }),
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function buildBoxContext(
  activeMachineProvider: ActiveMachineProvider,
  enumProvider: EnumerationProvider,
  commandHistory: CommandHistoryService,
  apiClient: HtbApiClient,
): Promise<BoxContext> {
  const machine = activeMachineProvider.activeMachine ?? null;
  const machineInfo = machine
    ? await apiClient.getMachineProfile(machine.id).catch(() => null)
    : null;

  return {
    machine,
    machineInfo,
    findings: enumProvider.findings,
    recentCommands: commandHistory.getRecent(30),
  };
}

async function runAiQuery(
  prompt: string,
  ctx: BoxContext,
  aiService: AiService,
  context: vscode.ExtensionContext,
  logger: Logger,
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'HTB AI: thinking…',
      cancellable: false,
    },
    async () => {
      try {
        const result = await aiService.ask(prompt, ctx, context);
        if (result !== null) {
          showAiResultPanel(context, result);
          logger.info('AI response received');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        void vscode.window.showErrorMessage(`AI request failed: ${msg}`);
        logger.error(`AI request failed: ${msg}`);
      }
    },
  );
}

function showAiResultPanel(context: vscode.ExtensionContext, result: string): void {
  const panel = vscode.window.createWebviewPanel(
    'htb.ai.result',
    'HTB AI Hint',
    vscode.ViewColumn.Beside,
    { enableScripts: false },
  );
  panel.webview.html = buildResultHtml(result);
  context.subscriptions.push(panel);
}

function buildResultHtml(result: string): string {
  const escaped = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:16px;line-height:1.6}
    h2{margin-top:0}
    .result{background:var(--vscode-textBlockQuote-background);border-left:4px solid var(--vscode-textLink-foreground);padding:12px 16px;border-radius:0 4px 4px 0}
  </style>
</head>
<body>
  <h2>HTB AI Hint</h2>
  <div class="result">${escaped}</div>
</body>
</html>`;
}

export { buildContextPayload };
