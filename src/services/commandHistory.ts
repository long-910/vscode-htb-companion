import * as vscode from 'vscode';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandLogEntry } from '../types/findings.js';
import { maskSensitive } from '../utils/mask.js';
import type { Logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

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

  get currentBoxDir(): string | undefined {
    return this._jsonlPath ? dirname(dirname(this._jsonlPath)) : undefined;
  }

  async capture(
    command: string,
    cwd: string,
    output?: string,
    exitCode?: number,
    section?: string,
  ): Promise<void> {
    const entry: CommandLogEntry = {
      timestamp: new Date().toISOString(),
      command: maskSensitive(command),
      cwd,
      section,
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

  private async maybeScreenshot(boxDir: string, section: string): Promise<string | undefined> {
    const cfg = vscode.workspace.getConfiguration('htb');
    if (!cfg.get<boolean>('writeup.captureScreenshots', true)) {
      return undefined;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotsDir = join(boxDir, 'screenshots');
    const filename = `${ts}-${section}.png`;
    const outPath = join(screenshotsDir, filename);

    try {
      await mkdir(screenshotsDir, { recursive: true });

      const platform = process.platform;
      if (platform === 'darwin') {
        // -i: interactive selection mode (user drags region)
        await execFileAsync('screencapture', ['-i', outPath]);
      } else if (platform === 'linux') {
        // Try scrot first, fall back to gnome-screenshot
        try {
          await execFileAsync('scrot', ['-s', outPath]);
        } catch {
          await execFileAsync('gnome-screenshot', ['-a', '-f', outPath]);
        }
      } else if (platform === 'win32') {
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}'); Start-Sleep -m 200; $img=[System.Windows.Forms.Clipboard]::GetImage(); $img.Save('${outPath.replace(/\\/g, '\\\\')}')`;
        await execFileAsync('powershell', ['-NonInteractive', '-Command', ps]);
      } else {
        return undefined;
      }

      this.logger.info(`Screenshot saved: ${outPath}`);
      return filename;
    } catch (e) {
      this.logger.warn(`Screenshot failed: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
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
        await this.capture(command, cwd, undefined, undefined, section?.label);

        const screenshotPath = await this.maybeScreenshot(
          this.currentBoxDir ?? cwd,
          section?.label ?? 'other',
        );

        const screenshotNote = screenshotPath ? ` 📸 ${screenshotPath}` : '';
        void vscode.window.showInformationMessage(
          `Captured: ${command.slice(0, 60)}${command.length > 60 ? '…' : ''} [${section?.label ?? 'other'}]${screenshotNote}`,
        );
        this.logger.info(`Captured command for writeup: ${command}`);
      }),
    );
  }
}
