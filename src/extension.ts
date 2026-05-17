import * as vscode from 'vscode';
import { HtbApiClient } from './services/htbApi.js';
import { AuthService } from './services/auth.js';
import { WorkspaceService } from './services/workspace.js';
import { VpnService } from './services/vpn.js';
import { CommandHistoryService } from './services/commandHistory.js';
import { StatusBarManager } from './views/statusBar.js';
import {
  ProfileProvider,
  ActiveMachineProvider,
  MachinesListProvider,
  RetiredMachinesProvider,
  StartingPointProvider,
  RecentBoxesProvider,
} from './views/machinesTree.js';
import { EnumerationProvider } from './views/enumPanel.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerMachineCommands } from './commands/machines.js';
import { registerFlagCommands } from './commands/flags.js';
import { registerEnumCommands } from './commands/enum.js';
import { registerAiCommands } from './commands/ai.js';
import { registerWriteupCommands } from './commands/writeup.js';
import { AiService } from './services/ai.js';
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

  const commandHistory = new CommandHistoryService(logger);
  commandHistory.registerCaptureCommand(context);

  // ── Views ─────────────────────────────────────────────────────────────────
  const statusBar = new StatusBarManager(context);
  const profileProvider = new ProfileProvider();
  const activeMachineProvider = new ActiveMachineProvider();
  const machinesListProvider = new MachinesListProvider();
  const retiredMachinesProvider = new RetiredMachinesProvider();
  const startingPointProvider = new StartingPointProvider();
  const recentBoxesProvider = new RecentBoxesProvider();
  const enumProvider = new EnumerationProvider();

  const savedBoxes = context.globalState.get<string[]>('htb.recentBoxes', []);
  recentBoxesProvider.update(savedBoxes);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('htbCompanion.profile', profileProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.activeMachine', activeMachineProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.machines', machinesListProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.recentBoxes', recentBoxesProvider),
    vscode.window.registerTreeDataProvider('htbCompanion.enumeration', enumProvider),
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
    recentBoxesProvider,
    auth,
    logger,
  );

  registerFlagCommands(context, apiClient, statusBar, activeMachineProvider, logger);
  registerEnumCommands(context, enumProvider, logger);

  const aiService = new AiService();
  registerAiCommands(
    context,
    aiService,
    enumProvider,
    activeMachineProvider,
    commandHistory,
    apiClient,
    logger,
  );

  registerWriteupCommands(context, commandHistory, enumProvider, logger);

  context.subscriptions.push(
    vscode.commands.registerCommand('htb.machines.loadMoreRetired', async () => {
      try {
        const nextPage = retiredMachinesProvider.currentPage + 1;
        const machines = await apiClient.listRetiredMachines(nextPage);
        retiredMachinesProvider.loadPage(machines, nextPage, machines.length >= 20);
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Failed to load more: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),
  );

  // ── Restore session ───────────────────────────────────────────────────────
  const profile = await auth.restoreSession(apiClient);
  if (profile) {
    statusBar.showProfile(profile);
    profileProvider.update(profile);

    const [activeMachine, machines, retiredPage1, spTier1, spTier2, spTier3] = await Promise.all([
      apiClient.getActiveMachine().catch(() => null),
      apiClient.listActiveMachines().catch(() => []),
      apiClient.listRetiredMachines(1).catch(() => []),
      apiClient.getStartingPoint(1).catch(() => []),
      apiClient.getStartingPoint(2).catch(() => []),
      apiClient.getStartingPoint(3).catch(() => []),
    ]);

    activeMachineProvider.update(activeMachine);
    machinesListProvider.update(machines);
    retiredMachinesProvider.loadPage(retiredPage1, 1, retiredPage1.length >= 20);
    startingPointProvider.update(1, spTier1);
    startingPointProvider.update(2, spTier2);
    startingPointProvider.update(3, spTier3);

    if (activeMachine) {
      statusBar.showActiveMachine(activeMachine);
      commandHistory.setWorkspace(workspaceService.getBoxDir(activeMachine.name));
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
