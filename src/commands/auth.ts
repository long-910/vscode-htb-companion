import * as vscode from 'vscode';
import type { AuthService } from '../services/auth.js';
import type { HtbApiClient } from '../services/htbApi.js';
import type { VpnService } from '../services/vpn.js';
import type { StatusBarManager } from '../views/statusBar.js';
import type {
  ProfileProvider,
  ActiveMachineProvider,
  MachinesListProvider,
} from '../views/machinesTree.js';
import type { Logger } from '../utils/logger.js';

export function registerAuthCommands(
  context: vscode.ExtensionContext,
  auth: AuthService,
  apiClient: HtbApiClient,
  vpn: VpnService,
  statusBar: StatusBarManager,
  profileProvider: ProfileProvider,
  activeMachineProvider: ActiveMachineProvider,
  machinesListProvider: MachinesListProvider,
  logger: Logger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('htb.signIn', async () => {
      try {
        const profile = await auth.signIn(apiClient);
        statusBar.showProfile(profile);
        profileProvider.update(profile);
        const [activeMachine, machines] = await Promise.all([
          apiClient.getActiveMachine().catch(() => null),
          apiClient.listActiveMachines().catch(() => []),
        ]);
        activeMachineProvider.update(activeMachine);
        machinesListProvider.update(machines);
        if (activeMachine) {
          statusBar.showActiveMachine(activeMachine);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        void vscode.window.showErrorMessage(msg);
        logger.error(`Sign in error: ${msg}`);
      }
    }),

    vscode.commands.registerCommand('htb.signOut', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Sign out of Hack The Box?',
        { modal: true },
        'Sign Out',
      );
      if (confirm !== 'Sign Out') {
        return;
      }
      if (vpn.state === 'connected') {
        await vpn.disconnect();
      }
      await auth.signOut();
      statusBar.showSignedOut();
      profileProvider.update(undefined);
      activeMachineProvider.update(null);
      machinesListProvider.update([], false);
    }),

    vscode.commands.registerCommand('htb.refresh', async () => {
      if (!(await auth.isAuthenticated())) {
        return;
      }
      try {
        const [profile, activeMachine, machines] = await Promise.all([
          apiClient.verifyToken(),
          apiClient.getActiveMachine().catch(() => null),
          apiClient.listActiveMachines().catch(() => []),
        ]);
        profileProvider.update(profile);
        activeMachineProvider.update(activeMachine);
        machinesListProvider.update(machines);
        if (activeMachine) {
          statusBar.showActiveMachine(activeMachine);
        } else {
          statusBar.hideActiveMachine();
        }
      } catch (e) {
        logger.error(`Refresh failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),

    vscode.commands.registerCommand('htb.vpn.connect', () => vpn.selectAndConnect()),
    vscode.commands.registerCommand('htb.vpn.disconnect', () => vpn.disconnect()),
    vscode.commands.registerCommand('htb.vpn.selectServer', () => vpn.selectAndConnect()),
  );

  vpn.onStateChange((state) => {
    if (state === 'connected' && vpn.currentServer) {
      statusBar.setVpnConnected(vpn.currentServer);
    } else if (state === 'connecting') {
      statusBar.setVpnConnecting();
    } else {
      statusBar.setVpnDisconnected();
    }
  });
}
