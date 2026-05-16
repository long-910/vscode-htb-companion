import * as vscode from 'vscode';
import type { HtbMachine, HtbProfile, HtbActiveMachine } from '../types/htb.js';

// ─── Tree Items ────────────────────────────────────────────────────────────────

class ProfileItem extends vscode.TreeItem {
  constructor(public readonly profile: HtbProfile) {
    super(profile.name, vscode.TreeItemCollapsibleState.None);
    this.description = profile.rank;
    this.iconPath = new vscode.ThemeIcon('account');
    this.tooltip = new vscode.MarkdownString(
      `**${profile.name}** — ${profile.rank}\n\n` +
        `Ownership: ${profile.ownership}% | Points: ${profile.points}\n\n` +
        `Subscription: ${profile.subscription}`,
    );
    this.contextValue = 'htbProfile';
  }
}

class ActiveMachineItem extends vscode.TreeItem {
  constructor(
    public readonly machine: HtbActiveMachine,
    public readonly userOwned: boolean,
    public readonly rootOwned: boolean,
  ) {
    super(machine.name, vscode.TreeItemCollapsibleState.Expanded);
    this.description = machine.ip;
    this.iconPath = new vscode.ThemeIcon('target');
    this.tooltip = `${machine.name} — ${machine.ip}`;
    this.contextValue = 'htbActiveMachine';
  }
}

class FlagStatusItem extends vscode.TreeItem {
  constructor(type: 'user' | 'root', owned: boolean) {
    const label = type === 'user' ? 'User Flag' : 'Root Flag';
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = owned ? '✓ owned' : '✗ pending';
    this.iconPath = new vscode.ThemeIcon(
      owned ? 'pass-filled' : 'circle-outline',
      owned
        ? new vscode.ThemeColor('testing.iconPassed')
        : new vscode.ThemeColor('testing.iconQueued'),
    );
    this.contextValue = owned ? `htbFlag${type}Owned` : `htbFlag${type}Pending`;
    if (!owned) {
      this.command = { command: 'htb.submitFlag', title: 'Submit Flag', arguments: [type] };
    }
  }
}

class ExpiryItem extends vscode.TreeItem {
  constructor(expiresAt: string) {
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - Date.now();
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
    const label = diffMs > 0 ? `Expires in ${diffH}h ${diffM}m` : `Expired ${Math.abs(diffH)}h ago`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('clock');
    this.contextValue = 'htbExpiry';
  }
}

class PlaceholderItem extends vscode.TreeItem {
  constructor(label: string, iconId = 'info') {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.contextValue = 'placeholder';
  }
}

class MachineListItem extends vscode.TreeItem {
  constructor(public readonly machine: HtbMachine) {
    super(machine.name, vscode.TreeItemCollapsibleState.None);
    const osIcon = machine.os === 'Windows' ? 'vm' : 'terminal-linux';
    this.description = `${machine.difficulty} · ${machine.os}`;
    this.iconPath = new vscode.ThemeIcon(osIcon);
    this.tooltip = new vscode.MarkdownString(
      `**${machine.name}** (${machine.os}, ${machine.difficulty})\n\n` +
        `User: ${machine.authUserInUserOwns ? '✓' : '✗'} | Root: ${machine.authUserInRootOwns ? '✓' : '✗'}\n\n` +
        `Points: ${machine.points} | Rating: ${machine.star}★`,
    );
    this.contextValue = 'htbMachine';
  }
}

class LoadMoreItem extends vscode.TreeItem {
  constructor() {
    super('Load more…', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('chevron-down');
    this.contextValue = 'loadMore';
    this.command = { command: 'htb.machines.loadMoreRetired', title: 'Load More' };
  }
}

class TierItem extends vscode.TreeItem {
  constructor(
    public readonly tier: 1 | 2 | 3,
    public readonly machines: HtbMachine[],
  ) {
    super(`Tier ${tier}`, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `(${machines.length})`;
    this.iconPath = new vscode.ThemeIcon('star');
    this.contextValue = 'spTier';
  }
}

class RecentBoxItem extends vscode.TreeItem {
  constructor(public readonly boxName: string) {
    super(boxName, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'recentBox';
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────

export class ProfileProvider implements vscode.TreeDataProvider<ProfileItem | PlaceholderItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _profile: HtbProfile | undefined;

  update(profile: HtbProfile | undefined): void {
    this._profile = profile;
    this._onChange.fire();
  }

  getTreeItem(el: ProfileItem | PlaceholderItem): vscode.TreeItem {
    return el;
  }

  getChildren(): Array<ProfileItem | PlaceholderItem> {
    if (!this._profile) {
      return [new PlaceholderItem('Sign in to view profile', 'sign-in')];
    }
    return [new ProfileItem(this._profile)];
  }
}

type ActiveMachineTreeItem = ActiveMachineItem | FlagStatusItem | ExpiryItem | PlaceholderItem;

export class ActiveMachineProvider implements vscode.TreeDataProvider<ActiveMachineTreeItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _machine: HtbActiveMachine | null | undefined;
  private _userOwned = false;
  private _rootOwned = false;

  update(machine: HtbActiveMachine | null | undefined, userOwned = false, rootOwned = false): void {
    this._machine = machine;
    this._userOwned = userOwned;
    this._rootOwned = rootOwned;
    this._onChange.fire();
  }

  getTreeItem(el: ActiveMachineTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(parent?: ActiveMachineTreeItem): ActiveMachineTreeItem[] {
    if (!parent) {
      if (!this._machine) {
        return [new PlaceholderItem('No active machine', 'circle-outline')];
      }
      return [new ActiveMachineItem(this._machine, this._userOwned, this._rootOwned)];
    }
    if (parent instanceof ActiveMachineItem) {
      const items: ActiveMachineTreeItem[] = [
        new FlagStatusItem('user', this._userOwned),
        new FlagStatusItem('root', this._rootOwned),
      ];
      if (parent.machine.expires_at) {
        items.push(new ExpiryItem(parent.machine.expires_at));
      }
      return items;
    }
    return [];
  }
}

export class MachinesListProvider implements vscode.TreeDataProvider<
  MachineListItem | PlaceholderItem
> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _machines: HtbMachine[] = [];
  private _loaded = false;

  update(machines: HtbMachine[], loaded = true): void {
    this._machines = machines;
    this._loaded = loaded;
    this._onChange.fire();
  }

  getTreeItem(el: MachineListItem | PlaceholderItem): vscode.TreeItem {
    return el;
  }

  getChildren(): Array<MachineListItem | PlaceholderItem> {
    if (!this._loaded) {
      return [new PlaceholderItem('Loading…', 'loading~spin')];
    }
    if (this._machines.length === 0) {
      return [new PlaceholderItem('Sign in to view machines', 'sign-in')];
    }
    return this._machines.map((m) => new MachineListItem(m));
  }
}

type RetiredTreeItem = MachineListItem | LoadMoreItem | PlaceholderItem;

export class RetiredMachinesProvider implements vscode.TreeDataProvider<RetiredTreeItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _machines: HtbMachine[] = [];
  private _page = 0;
  private _hasMore = true;
  private _loaded = false;

  loadPage(machines: HtbMachine[], page: number, hasMore: boolean): void {
    this._machines = page === 1 ? machines : [...this._machines, ...machines];
    this._page = page;
    this._hasMore = hasMore;
    this._loaded = true;
    this._onChange.fire();
  }

  get currentPage(): number {
    return this._page;
  }

  getTreeItem(el: RetiredTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(): RetiredTreeItem[] {
    if (!this._loaded) {
      return [new PlaceholderItem('Sign in to view retired machines', 'sign-in')];
    }
    if (this._machines.length === 0) {
      return [new PlaceholderItem('No retired machines found', 'circle-outline')];
    }
    const items: RetiredTreeItem[] = this._machines.map((m) => new MachineListItem(m));
    if (this._hasMore) {
      items.push(new LoadMoreItem());
    }
    return items;
  }
}

type StartingPointTreeItem = TierItem | MachineListItem | PlaceholderItem;

export class StartingPointProvider implements vscode.TreeDataProvider<StartingPointTreeItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _tiers = new Map<1 | 2 | 3, HtbMachine[]>();
  private _loaded = false;

  update(tier: 1 | 2 | 3, machines: HtbMachine[]): void {
    this._tiers.set(tier, machines);
    this._loaded = true;
    this._onChange.fire();
  }

  getTreeItem(el: StartingPointTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(parent?: StartingPointTreeItem): StartingPointTreeItem[] {
    if (!parent) {
      if (!this._loaded) {
        return [new PlaceholderItem('Sign in to view Starting Point', 'sign-in')];
      }
      return ([1, 2, 3] as const).map((t) => new TierItem(t, this._tiers.get(t) ?? []));
    }
    if (parent instanceof TierItem) {
      return parent.machines.map((m) => new MachineListItem(m));
    }
    return [];
  }
}

export class RecentBoxesProvider implements vscode.TreeDataProvider<
  RecentBoxItem | PlaceholderItem
> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;
  private _boxes: string[] = [];

  update(boxes: string[]): void {
    this._boxes = boxes.slice(0, 20);
    this._onChange.fire();
  }

  addBox(name: string): void {
    this._boxes = [name, ...this._boxes.filter((b) => b !== name)].slice(0, 20);
    this._onChange.fire();
  }

  get boxes(): ReadonlyArray<string> {
    return this._boxes;
  }

  getTreeItem(el: RecentBoxItem | PlaceholderItem): vscode.TreeItem {
    return el;
  }

  getChildren(): Array<RecentBoxItem | PlaceholderItem> {
    if (this._boxes.length === 0) {
      return [new PlaceholderItem('No recent boxes', 'history')];
    }
    return this._boxes.map((name) => new RecentBoxItem(name));
  }
}
