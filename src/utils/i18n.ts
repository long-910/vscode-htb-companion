import * as vscode from 'vscode';

export function t(key: string, ...args: Array<string | number | boolean>): string {
  return vscode.l10n.t(key, ...args);
}
