import * as vscode from 'vscode';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandHistoryService } from '../services/commandHistory.js';
import type { EnumerationProvider } from '../views/enumPanel.js';
import type { Logger } from '../utils/logger.js';

export function registerWriteupCommands(
  context: vscode.ExtensionContext,
  commandHistory: CommandHistoryService,
  enumProvider: EnumerationProvider,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'htb.writeup.draft',
      () => void draftWriteup(commandHistory, enumProvider, logger),
    ),
    vscode.commands.registerCommand(
      'htb.writeup.exportMarkdown',
      () => void exportMarkdown(commandHistory, enumProvider, logger),
    ),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveBoxDir(commandHistory: CommandHistoryService): string | undefined {
  if (commandHistory.currentBoxDir) {
    return commandHistory.currentBoxDir;
  }
  // Fall back to the first workspace folder that looks like a box workspace.
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    return folder.uri.fsPath;
  }
  return undefined;
}

function formatCommands(entries: ReturnType<CommandHistoryService['entries']['slice']>): string {
  if (entries.length === 0) {
    return '_No commands captured for this section._';
  }
  return entries
    .map((e) => {
      const block = `\`\`\`bash\n$ ${e.command}${e.output ? '\n' + e.output.trim() : ''}\n\`\`\``;
      return block;
    })
    .join('\n\n');
}

async function buildPopulatedWriteup(
  boxDir: string,
  commandHistory: CommandHistoryService,
  enumProvider: EnumerationProvider,
): Promise<string> {
  // Load template (current writeup.md; use a fresh template as fallback)
  let template: string;
  try {
    template = await readFile(join(boxDir, 'writeup.md'), 'utf-8');
  } catch {
    template = [
      '# {{ BOX_NAME }} — HTB Writeup',
      '',
      '**OS**: {{ OS }} | **Difficulty**: {{ DIFFICULTY }} | **Owned**: {{ OWN_DATE }}',
      '',
      '## TL;DR',
      '',
      '{{ AI_SUMMARY }}',
      '',
      '## Recon',
      '',
      '{{ COMMAND_LOG_RECON }}',
      '',
      '## Enumeration',
      '',
      '{{ COMMAND_LOG_ENUM }}',
      '',
      '## Foothold',
      '',
      '{{ COMMAND_LOG_FOOTHOLD }}',
      '',
      '## Privilege Escalation',
      '',
      '{{ COMMAND_LOG_PRIVESC }}',
      '',
      '## Loot',
      '',
      '{{ COMMAND_LOG_LOOT }}',
      '',
      '## Lessons Learned',
      '',
      '{{ USER_NOTES }}',
    ].join('\n');
  }

  // Box metadata
  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(await readFile(join(boxDir, '.htb', 'box.json'), 'utf-8')) as Record<
      string,
      string
    >;
  } catch {
    /* no metadata yet */
  }

  // Notes
  let notes = '';
  try {
    notes = (await readFile(join(boxDir, 'notes.md'), 'utf-8')).trim();
  } catch {
    /* no notes */
  }

  // Command sections
  const entries = [...commandHistory.entries];
  const bySection = (tag: string) => entries.filter((e) => (e.section ?? 'other') === tag);

  // Findings summary from enumeration panel
  const findings = [...enumProvider.findings];
  const ports = findings.filter((f) => f.type === 'port');
  const portBlock =
    ports.length > 0
      ? '```\n' + ports.map((p) => p.value).join('\n') + '\n```'
      : '_No port findings imported._';

  const now = new Date().toISOString().split('T')[0] ?? '';

  const substitutions: Record<string, string> = {
    BOX_NAME: meta['name'] ?? 'Unknown',
    OS: meta['os'] ?? 'Unknown',
    DIFFICULTY: meta['difficulty'] ?? 'Unknown',
    TARGET_IP: meta['ip'] ?? 'Unknown',
    OWN_DATE: now,
    AI_SUMMARY: '_[Use HTB AI: Suggest Next Step for hints, or write your own summary.]_',
    NMAP_OUTPUT_FORMATTED: portBlock,
    COMMAND_LOG_RECON: formatCommands(bySection('recon')),
    COMMAND_LOG_ENUM: formatCommands(bySection('enumeration')),
    COMMAND_LOG_FOOTHOLD: formatCommands(bySection('foothold')),
    COMMAND_LOG_PRIVESC: formatCommands(bySection('privesc')),
    COMMAND_LOG_LOOT: formatCommands(bySection('loot')),
    USER_NOTES: notes || '_No notes captured yet._',
  };

  // Also replace legacy single-block placeholder if present
  substitutions['NMAP_COMMAND'] = formatCommands(bySection('recon'));

  let populated = template;
  for (const [key, value] of Object.entries(substitutions)) {
    populated = populated.replaceAll(`{{ ${key} }}`, value);
  }
  return populated;
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function draftWriteup(
  commandHistory: CommandHistoryService,
  enumProvider: EnumerationProvider,
  logger: Logger,
): Promise<void> {
  const boxDir = resolveBoxDir(commandHistory);
  if (!boxDir) {
    void vscode.window.showWarningMessage('No active box workspace. Open a box workspace first.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'HTB: Drafting writeup…' },
    async () => {
      const populated = await buildPopulatedWriteup(boxDir, commandHistory, enumProvider);
      const outPath = join(boxDir, 'writeup.md');
      await writeFile(outPath, populated, 'utf-8');
      logger.info(`Writeup drafted: ${outPath}`);

      const doc = await vscode.workspace.openTextDocument(outPath);
      await vscode.window.showTextDocument(doc, { preview: false });
    },
  );

  void vscode.window.showInformationMessage('Writeup drafted! Review and complete writeup.md.');
}

async function exportMarkdown(
  commandHistory: CommandHistoryService,
  enumProvider: EnumerationProvider,
  logger: Logger,
): Promise<void> {
  const boxDir = resolveBoxDir(commandHistory);
  if (!boxDir) {
    void vscode.window.showWarningMessage('No active box workspace. Open a box workspace first.');
    return;
  }

  const populated = await buildPopulatedWriteup(boxDir, commandHistory, enumProvider);

  const defaultName =
    (
      JSON.parse(
        await readFile(join(boxDir, '.htb', 'box.json'), 'utf-8').catch(() => '{}'),
      ) as Record<string, string>
    )['name'] ?? 'writeup';

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(join(boxDir, `${defaultName}-writeup.md`)),
    filters: { Markdown: ['md'] },
    title: 'Export Writeup',
  });
  if (!uri) {
    return;
  }

  await writeFile(uri.fsPath, populated, 'utf-8');
  logger.info(`Writeup exported: ${uri.fsPath}`);

  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });

  void vscode.window.showInformationMessage(`Writeup exported to ${uri.fsPath}`);
}
