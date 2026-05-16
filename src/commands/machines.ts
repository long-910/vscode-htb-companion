import * as vscode from 'vscode';
import type { HtbApiClient } from '../services/htbApi.js';
import type { WorkspaceService } from '../services/workspace.js';
import type { StatusBarManager } from '../views/statusBar.js';
import type { ActiveMachineProvider } from '../views/machinesTree.js';
import type { AuthService } from '../services/auth.js';
import type { Logger } from '../utils/logger.js';
import type { HtbMachine } from '../types/htb.js';

export function registerMachineCommands(
  context: vscode.ExtensionContext,
  apiClient: HtbApiClient,
  workspaceService: WorkspaceService,
  statusBar: StatusBarManager,
  activeMachineProvider: ActiveMachineProvider,
  auth: AuthService,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('htb.spawnMachine', async (machine?: HtbMachine) => {
      if (!machine) {
        void vscode.window.showErrorMessage('No machine selected. Use the Machines tree view.');
        return;
      }
      const confirm = await vscode.window.showInformationMessage(
        `Spawn ${machine.name} (${machine.difficulty}, ${machine.os})?`,
        { modal: true },
        'Spawn',
      );
      if (confirm !== 'Spawn') {
        return;
      }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Spawning ${machine.name}…` },
        async () => {
          try {
            await apiClient.spawnMachine(machine.id);
            const active = await apiClient.getActiveMachine();
            if (active) {
              activeMachineProvider.update(active);
              statusBar.showActiveMachine(active);
              statusBar.showFlagProgress(false, false);
            }
            void vscode.window.showInformationMessage(
              `${machine.name} spawned! IP: ${active?.ip ?? 'pending'}`,
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            void vscode.window.showErrorMessage(`Spawn failed: ${msg}`);
            logger.error(`spawnMachine: ${msg}`);
          }
        },
      );
    }),

    vscode.commands.registerCommand('htb.terminateMachine', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Terminate the active machine?',
        { modal: true },
        'Terminate',
      );
      if (confirm !== 'Terminate') {
        return;
      }
      try {
        await apiClient.terminateMachine();
        activeMachineProvider.update(null);
        statusBar.hideActiveMachine();
        void vscode.window.showInformationMessage('Machine terminated.');
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Terminate failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),

    vscode.commands.registerCommand('htb.resetMachine', async (machine?: HtbMachine) => {
      if (!machine) {
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Reset ${machine.name}? This reverts the machine to its initial state.`,
        { modal: true },
        'Reset',
      );
      if (confirm !== 'Reset') {
        return;
      }
      try {
        await apiClient.resetMachine(machine.id);
        void vscode.window.showInformationMessage(`${machine.name} reset initiated.`);
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Reset failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),

    vscode.commands.registerCommand('htb.openBoxWorkspace', async (machine?: HtbMachine) => {
      let targetMachine = machine;
      if (!targetMachine) {
        void vscode.window.showInformationMessage(
          'Select a machine from the tree to open its workspace.',
        );
        return;
      }
      const active = await apiClient.getActiveMachine().catch(() => null);
      const ip = active?.ip ?? '0.0.0.0';
      try {
        const boxDir = await workspaceService.scaffoldBoxWorkspace(targetMachine, ip);
        await workspaceService.openBoxWorkspace(boxDir);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        void vscode.window.showErrorMessage(`Failed to open workspace: ${msg}`);
        logger.error(`openBoxWorkspace: ${msg}`);
      }
    }),

    vscode.commands.registerCommand('htb.copyTargetIp', async () => {
      const active = await apiClient.getActiveMachine().catch(() => null);
      if (!active) {
        void vscode.window.showWarningMessage('No active machine with an IP address.');
        return;
      }
      await vscode.env.clipboard.writeText(active.ip);
      void vscode.window.showInformationMessage(`Copied ${active.ip} to clipboard.`);
    }),

    vscode.commands.registerCommand('htb.openMachineInBrowser', (machine?: HtbMachine) => {
      if (!machine) {
        return;
      }
      const url = `https://app.hackthebox.com/machines/${machine.id}`;
      void vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}
