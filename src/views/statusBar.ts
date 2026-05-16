import * as vscode from 'vscode';
import type { HtbProfile, HtbActiveMachine } from '../types/htb.js';

export class StatusBarManager {
  private readonly accountItem: vscode.StatusBarItem;
  private readonly vpnItem: vscode.StatusBarItem;
  private readonly boxItem: vscode.StatusBarItem;
  private readonly flagItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.accountItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.vpnItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.boxItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.flagItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);

    context.subscriptions.push(this.accountItem, this.vpnItem, this.boxItem, this.flagItem);
    this.showSignedOut();
  }

  showSignedOut(): void {
    this.accountItem.text = '$(person) HTB: Sign In';
    this.accountItem.tooltip = 'Click to sign in to Hack The Box';
    this.accountItem.command = 'htb.signIn';
    this.accountItem.show();
    this.vpnItem.hide();
    this.boxItem.hide();
    this.flagItem.hide();
  }

  showProfile(profile: HtbProfile): void {
    this.accountItem.text = `$(person) HTB: ${profile.name}`;
    this.accountItem.tooltip = new vscode.MarkdownString(
      `**${profile.name}** — ${profile.rank}  \nOwnership: ${profile.ownership}%  \nPoints: ${profile.points}`,
    );
    this.accountItem.command = undefined;
    this.accountItem.show();
    if (this.vpnItem.text === '') {
      this.setVpnDisconnected();
    }
    this.vpnItem.show();
  }

  setVpnConnected(server: string): void {
    this.vpnItem.text = `$(plug) VPN: ${server}`;
    this.vpnItem.color = new vscode.ThemeColor('testing.iconPassed');
    this.vpnItem.tooltip = `Connected to ${server}. Click to disconnect.`;
    this.vpnItem.command = 'htb.vpn.disconnect';
    this.vpnItem.show();
  }

  setVpnDisconnected(): void {
    this.vpnItem.text = '$(circle-slash) VPN: off';
    this.vpnItem.color = new vscode.ThemeColor('testing.iconFailed');
    this.vpnItem.tooltip = 'VPN disconnected. Click to connect.';
    this.vpnItem.command = 'htb.vpn.connect';
    this.vpnItem.show();
  }

  setVpnConnecting(): void {
    this.vpnItem.text = '$(loading~spin) VPN: connecting…';
    this.vpnItem.color = undefined;
    this.vpnItem.command = undefined;
    this.vpnItem.show();
  }

  showActiveMachine(machine: HtbActiveMachine): void {
    this.boxItem.text = `$(target) ${machine.name} [${machine.ip}]`;
    this.boxItem.tooltip = `Active: ${machine.name} (${machine.ip}). Click to open workspace.`;
    this.boxItem.command = 'htb.openBoxWorkspace';
    this.boxItem.show();
  }

  hideActiveMachine(): void {
    this.boxItem.hide();
    this.flagItem.hide();
  }

  showFlagProgress(userOwned: boolean, rootOwned: boolean): void {
    const count = (userOwned ? 1 : 0) + (rootOwned ? 1 : 0);
    this.flagItem.text = `$(flag) ${count}/2`;
    this.flagItem.tooltip =
      `User: ${userOwned ? '✓' : '✗'} | Root: ${rootOwned ? '✓' : '✗'}. ` + 'Click to submit flag.';
    this.flagItem.command = 'htb.submitFlag';
    this.flagItem.show();
  }
}
