import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import type { EnumFinding } from '../types/findings.js';
import { EnumerationProvider, importOutputToFindings } from '../views/enumPanel.js';
import type { Logger } from '../utils/logger.js';

export function registerEnumCommands(
  context: vscode.ExtensionContext,
  enumProvider: EnumerationProvider,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('htb.enum.importNmap', async () => {
      const uris = await vscode.window.showOpenDialog({
        title: 'Import Scan Output',
        filters: {
          'Scan Output': ['txt', 'xml', 'json', 'gnmap'],
          'All Files': ['*'],
        },
        canSelectMany: false,
      });
      if (!uris?.[0]) {
        return;
      }

      try {
        const content = await readFile(uris[0].fsPath, 'utf-8');
        const count = await importOutputToFindings(content, enumProvider);
        void vscode.window.showInformationMessage(
          count > 0 ? `Imported ${count} finding(s).` : 'No findings detected in file.',
        );
        logger.info(`Imported ${count} findings from ${uris[0].fsPath}`);
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Import failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),

    vscode.commands.registerCommand('htb.enum.addFinding', async () => {
      const typeLabels = [
        { label: 'port', description: 'Open port / service' },
        { label: 'directory', description: 'Web directory / endpoint' },
        { label: 'subdomain', description: 'Subdomain / vhost' },
        { label: 'user', description: 'Username' },
        { label: 'credential', description: 'Credential (user:pass)' },
        { label: 'cve', description: 'CVE / vulnerability' },
        { label: 'note', description: 'General note' },
      ];

      const typePick = await vscode.window.showQuickPick(typeLabels, {
        title: 'Finding Type',
      });
      if (!typePick) {
        return;
      }

      const value = await vscode.window.showInputBox({
        title: `Add ${typePick.label} Finding`,
        prompt: 'Enter the value',
        ignoreFocusOut: true,
      });
      if (!value) {
        return;
      }

      enumProvider.addFindings([
        {
          type: typePick.label as EnumFinding['type'],
          value: value.trim(),
          source: 'manual',
          confidence: 'high',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ]);
      void vscode.window.showInformationMessage(`Finding added: ${value}`);
    }),

    vscode.commands.registerCommand('htb.enum.copyFinding', async (value?: string) => {
      if (!value) {
        return;
      }
      await vscode.env.clipboard.writeText(value);
      void vscode.window.showInformationMessage(`Copied: ${value}`);
    }),

    vscode.commands.registerCommand('htb.enum.showVisualizer', () => {
      void vscode.window.showInformationMessage(
        'Enumeration Visualizer will be available in Phase 4.',
      );
    }),
  );
}
