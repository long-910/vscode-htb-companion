import * as vscode from 'vscode';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { CommandLogEntry } from '../types/findings.js';
import { maskSensitive } from '../utils/mask.js';
import type { Logger } from '../utils/logger.js';

const MAX_OUTPUT_BYTES = 10_240;
const MAX_LOG_ENTRIES = 500;

export class CommandHistoryService {
  private _entries: CommandLogEntry[] = [];
  private _jsonlPath: string | undefined;

  constructor(private readonly logger: Logger) {}

  /** Set the path to the .htb/commands.jsonl file for the active workspace. */
  setWorkspace(boxDir: string): void {
    this._jsonlPath = join(boxDir, '.htb', 'commands.jsonl');
    this._entries = [];
    void this.loadExisting();
  }

  private async loadExisting(): Promise<void> {
    if (!this._jsonlPath) {
      return;
    }
    try {
      const raw = await readFile(this._jsonlPath, 'utf-8');
      this._entries = raw
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as CommandLogEntry)
        .slice(-MAX_LOG_ENTRIES);
    } catch {
      /* file may not exist yet */
    }
  }

  async capture(command: string, cwd: string, output?: string, exitCode?: number): Promise<void> {
    const entry: CommandLogEntry = {
      timestamp: new Date().toISOString(),
      command: maskSensitive(command),
      cwd,
      exitCode,
      output: output ? maskSensitive(output.slice(0, MAX_OUTPUT_BYTES)) : undefined,
    };

    this._entries.push(entry);
    if (this._entries.length > MAX_LOG_ENTRIES) {
      this._entries = this._entries.slice(-MAX_LOG_ENTRIES);
    }

    if (this._jsonlPath) {
      try {
        await mkdir(dirname(this._jsonlPath), { recursive: true });
        await appendFile(this._jsonlPath, JSON.stringify(entry) + '\n', 'utf-8');
      } catch (e) {
        this.logger.warn(
          `Failed to persist command log: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  get entries(): ReadonlyArray<CommandLogEntry> {
    return this._entries;
  }

  getRecent(n = 30): CommandLogEntry[] {
    return this._entries.slice(-n);
  }

  registerCaptureCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('htb.terminal.captureCommand', async () => {
        const terminal = vscode.window.activeTerminal;
        if (!terminal) {
          void vscode.window.showWarningMessage('No active terminal.');
          return;
        }

        const command = await vscode.window.showInputBox({
          title: 'Capture Command for Writeup',
          prompt: 'Enter the command you just ran (or paste it)',
          ignoreFocusOut: true,
          placeHolder: 'nmap -sCV -p- -T4 10.10.11.1',
        });
        if (!command) {
          return;
        }

        const section = await vscode.window.showQuickPick(
          [
            { label: 'recon', description: 'Reconnaissance / port scan' },
            { label: 'enumeration', description: 'Service enumeration' },
            { label: 'foothold', description: 'Initial access' },
            { label: 'privesc', description: 'Privilege escalation' },
            { label: 'loot', description: 'Post-exploitation / loot' },
            { label: 'other', description: 'Uncategorized' },
          ],
          { title: 'Tag this command for writeup', placeHolder: 'Select a section' },
        );

        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        await this.capture(command, cwd, undefined, undefined);

        void vscode.window.showInformationMessage(
          `Captured: ${command.slice(0, 60)}${command.length > 60 ? '…' : ''} [${section?.label ?? 'other'}]`,
        );
        this.logger.info(`Captured command for writeup: ${command}`);
      }),
    );
  }
}
