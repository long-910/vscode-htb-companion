import * as vscode from 'vscode';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HtbApiClient } from '../services/htbApi.js';
import type { Logger } from '../utils/logger.js';

const SSH_CONFIG_PATH = join(homedir(), '.ssh', 'config');
const HOST_ALIAS = 'htb-pwnbox';

export function registerPwnboxCommands(
  context: vscode.ExtensionContext,
  apiClient: HtbApiClient,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'htb.pwnbox.configSsh',
      () => void configurePwnboxSsh(apiClient, logger),
    ),
  );
}

async function configurePwnboxSsh(apiClient: HtbApiClient, logger: Logger): Promise<void> {
  let pwnbox: Awaited<ReturnType<HtbApiClient['getPwnboxStatus']>>;
  try {
    pwnbox = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'HTB: Fetching Pwnbox info…' },
      () => apiClient.getPwnboxStatus(),
    );
  } catch (e) {
    void vscode.window.showErrorMessage(
      `Failed to get Pwnbox status: ${e instanceof Error ? e.message : String(e)}`,
    );
    return;
  }

  if (pwnbox.status !== 'running') {
    void vscode.window.showWarningMessage(
      `Pwnbox is not running (status: ${pwnbox.status}). Start it on HTB and try again.`,
    );
    return;
  }

  const block = buildSshBlock(pwnbox.hostname, pwnbox.username);
  await upsertSshConfig(block);
  logger.info(`Pwnbox SSH config written: ${HOST_ALIAS} → ${pwnbox.hostname}`);

  const choice = await vscode.window.showInformationMessage(
    `Pwnbox SSH config saved (Host: ${HOST_ALIAS}, User: ${pwnbox.username}, ${pwnbox.hostname}). Open with Remote-SSH?`,
    'Connect',
    'Copy SSH Command',
    'Dismiss',
  );

  if (choice === 'Connect') {
    await vscode.commands.executeCommand('opensshremotes.openEmptyWindow', {
      hostName: HOST_ALIAS,
    });
  } else if (choice === 'Copy SSH Command') {
    await vscode.env.clipboard.writeText(`ssh ${HOST_ALIAS}`);
    void vscode.window.showInformationMessage('SSH command copied to clipboard.');
  }
}

function buildSshBlock(hostname: string, username: string): string {
  return [
    `# HTB Pwnbox — managed by HTB Companion`,
    `Host ${HOST_ALIAS}`,
    `    HostName ${hostname}`,
    `    User ${username}`,
    `    StrictHostKeyChecking no`,
    `    UserKnownHostsFile /dev/null`,
  ].join('\n');
}

async function upsertSshConfig(block: string): Promise<void> {
  let existing = '';
  try {
    existing = await readFile(SSH_CONFIG_PATH, 'utf-8');
  } catch {
    /* file may not exist */
  }

  // Remove any existing htb-pwnbox block
  const cleaned = existing
    .split('\n')
    .reduce<{ out: string[]; skip: boolean }>(
      (acc, line) => {
        if (line.startsWith(`Host ${HOST_ALIAS}`)) {
          acc.skip = true;
        } else if (acc.skip && (line.startsWith('Host ') || line.startsWith('#'))) {
          acc.skip = false;
        }
        if (!acc.skip) {
          acc.out.push(line);
        }
        return acc;
      },
      { out: [], skip: false },
    )
    .out.join('\n')
    .trimEnd();

  const newContent = (cleaned ? cleaned + '\n\n' : '') + block + '\n';
  await writeFile(SSH_CONFIG_PATH, newContent, { encoding: 'utf-8', mode: 0o600 });
}
