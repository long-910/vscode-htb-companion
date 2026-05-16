import * as vscode from 'vscode';
import { HtbApiClient } from './services/htbApi.js';
import { AuthService } from './services/auth.js';
import { WorkspaceService } from './services/workspace.js';
import { VpnService } from './services/vpn.js';
import { StatusBarManager } from './views/statusBar.js';
import {
  ProfileProvider,
  ActiveMachineProvider,
  MachinesListProvider,
} from './views/machinesTree.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerMachineCommands } from './commands/machines.js';
import { registerFlagCommands } from './commands/flags.js';
import { createLogger } from './utils/logger.js';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = createLogger('HTB Companion');
  context.subscriptions.push({ dispose: () => logger.dispose() });
  logger.info('HTB Companion activating…');

  // ── Services ──────────────────────────────────────────────────────────────
  const auth = new AuthService(context.secrets, logger);
  const apiClient = new HtbApiClient(() => auth.getToken(), logger);
  const workspaceService = new WorkspaceService(context.extensionPath, logger);
  const vpn = new VpnService(logger);
  context.subscriptions.push({ dispose: () => vpn.dispose() });

  // ── Views ─────────────────────────────────────────────────────────────────
  const statusBar = new StatusBarManager(context);
  const profileProvider = new ProfileProvider();
  const activeMachineProvider = new ActiveMachineProvider();
  const machinesListProvider = new MachinesListProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('htbCompanion.profile', profileProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.activeMachine', activeMachineProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.machines', machinesListProvider),
  );

  // ── Commands ──────────────────────────────────────────────────────────────
  registerAuthCommands(
    context,
    auth,
    apiClient,
    vpn,
    statusBar,
    profileProvider,
    activeMachineProvider,
    machinesListProvider,
    logger,
  );

  registerMachineCommands(
    context,
    apiClient,
    workspaceService,
    statusBar,
    activeMachineProvider,
    auth,
    logger,
  );

  registerFlagCommands(context, apiClient, statusBar, activeMachineProvider, logger);

  // ── Restore session ───────────────────────────────────────────────────────
  const profile = await auth.restoreSession(apiClient);
  if (profile) {
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
      const machineInfo = await apiClient.getMachineProfile(activeMachine.id).catch(() => null);
      statusBar.showFlagProgress(
        machineInfo?.authUserInUserOwns ?? false,
        machineInfo?.authUserInRootOwns ?? false,
      );
    }
  }

  logger.info('HTB Companion ready.');
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions
}
