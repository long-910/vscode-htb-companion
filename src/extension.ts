import * as vscode from 'vscode';

export function activate(_context: vscode.ExtensionContext): void {
  console.log('HTB Companion is now active');
}

export function deactivate(): void {
  console.log('HTB Companion deactivated');
}
