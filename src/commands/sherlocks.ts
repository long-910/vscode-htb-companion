import * as vscode from 'vscode';
import type { HtbApiClient } from '../services/htbApi.js';
import type { SherlocksProvider } from '../views/sherlocksTree.js';
import type { HtbSherlock } from '../types/htb.js';
import type { Logger } from '../utils/logger.js';

export function registerSherlocksCommands(
  context: vscode.ExtensionContext,
  apiClient: HtbApiClient,
  sherlocksProvider: SherlocksProvider,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'htb.sherlocks.refresh',
      () => void loadSherlocks(apiClient, sherlocksProvider, logger),
    ),

    vscode.commands.registerCommand(
      'htb.sherlocks.open',
      (sherlock: HtbSherlock) => void openSherlock(sherlock),
    ),

    vscode.commands.registerCommand(
      'htb.sherlocks.downloadFiles',
      (sherlock: HtbSherlock) => void downloadSherlockFiles(sherlock),
    ),
  );
}

export async function loadSherlocks(
  apiClient: HtbApiClient,
  provider: SherlocksProvider,
  logger: Logger,
): Promise<void> {
  provider.setLoading(true);
  try {
    const sherlocks = await apiClient.listSherlocks();
    provider.update(sherlocks);
    logger.info(`Loaded ${sherlocks.length} Sherlocks`);
  } catch (e) {
    provider.setLoading(false);
    logger.warn(`Failed to load Sherlocks: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function openSherlock(sherlock: HtbSherlock): Promise<void> {
  const choices: string[] = [];
  if (sherlock.filesUrl) {
    choices.push('Download Files');
  }
  choices.push('Open in Browser', 'Copy Name');

  const pick = await vscode.window.showQuickPick(choices, {
    title: `${sherlock.name} — ${sherlock.difficulty} · ${sherlock.category}`,
    placeHolder: sherlock.description ?? 'Select action',
  });

  if (pick === 'Download Files') {
    await downloadSherlockFiles(sherlock);
  } else if (pick === 'Open in Browser') {
    await vscode.env.openExternal(
      vscode.Uri.parse(`https://app.hackthebox.com/sherlocks/${sherlock.id}`),
    );
  } else if (pick === 'Copy Name') {
    await vscode.env.clipboard.writeText(sherlock.name);
    void vscode.window.showInformationMessage(`Copied: ${sherlock.name}`);
  }
}

async function downloadSherlockFiles(sherlock: HtbSherlock): Promise<void> {
  if (!sherlock.filesUrl) {
    void vscode.window.showWarningMessage(`No download available for ${sherlock.name}.`);
    return;
  }
  await vscode.env.openExternal(vscode.Uri.parse(sherlock.filesUrl));
}
