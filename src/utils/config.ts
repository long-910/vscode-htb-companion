import * as vscode from 'vscode';

export function getConfig() {
  return vscode.workspace.getConfiguration('htb');
}

export function getWorkspaceRoot(): string {
  return getConfig().get<string>('workspaceRoot', '~/htb');
}

export function getWorkspaceTemplate(): 'minimal' | 'standard' | 'full' {
  return getConfig().get<'minimal' | 'standard' | 'full'>('workspaceTemplate', 'standard');
}

export function getAiProvider(): string {
  return getConfig().get<string>('ai.provider', 'auto');
}

export function getAiHintLevel(): string {
  return getConfig().get<string>('ai.hintLevel', 'nudge');
}

export function getAiContextMode(): 'minimal' | 'current-box' | 'full-history' {
  return getConfig().get<'minimal' | 'current-box' | 'full-history'>(
    'ai.contextMode',
    'current-box',
  );
}

export function isTelemetryEnabled(): boolean {
  return getConfig().get<boolean>('telemetry', false);
}
