import * as vscode from 'vscode';
import type { HtbApiClient } from '../services/htbApi.js';
import type { StatusBarManager } from '../views/statusBar.js';
import type { ActiveMachineProvider } from '../views/machinesTree.js';
import type { Logger } from '../utils/logger.js';

export function registerFlagCommands(
  context: vscode.ExtensionContext,
  apiClient: HtbApiClient,
  statusBar: StatusBarManager,
  activeMachineProvider: ActiveMachineProvider,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('htb.submitFlag', async (flagType?: 'user' | 'root') => {
      const active = await apiClient.getActiveMachine().catch(() => null);
      if (!active) {
        void vscode.window.showWarningMessage('No active machine. Spawn a machine first.');
        return;
      }

      const flag = await vscode.window.showInputBox({
        title: 'Submit HTB Flag',
        prompt: `Submit ${flagType ?? 'user/root'} flag for ${active.name}`,
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'HTB{...}',
        validateInput: (v) => {
          if (!v.trim().startsWith('HTB{') || !v.trim().endsWith('}')) {
            return 'Flag format should be HTB{...}';
          }
          return null;
        },
      });
      if (!flag) {
        return;
      }

      const difficulty = await vscode.window.showQuickPick(
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((n) => ({
          label: n,
          description: n === '5' ? '(default)' : undefined,
        })),
        { title: 'Rate difficulty (1=Easy, 10=Insane)', placeHolder: '5' },
      );
      const diffNum = parseInt(difficulty?.label ?? '5', 10);

      try {
        const result = await apiClient.submitFlag(active.id, flag.trim(), diffNum);
        if (result.success) {
          void vscode.window.showInformationMessage(`🎉 ${result.message}`);
          logger.info(`Flag accepted for ${active.name}: ${result.ownType}`);
          const fresh = await apiClient.getActiveMachine().catch(() => null);
          if (fresh) {
            const machineInfo = await apiClient.getMachineProfile(fresh.id).catch(() => null);
            activeMachineProvider.update(
              fresh,
              machineInfo?.authUserInUserOwns ?? false,
              machineInfo?.authUserInRootOwns ?? false,
            );
            statusBar.showFlagProgress(
              machineInfo?.authUserInUserOwns ?? false,
              machineInfo?.authUserInRootOwns ?? false,
            );
          }
        } else {
          void vscode.window.showWarningMessage(`Incorrect flag: ${result.message}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        void vscode.window.showErrorMessage(`Flag submission failed: ${msg}`);
        logger.error(`submitFlag: ${msg}`);
      }
    }),
  );
}
