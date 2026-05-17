import * as vscode from 'vscode';
import type { HtbSherlock } from '../types/htb.js';

const DIFFICULTY_ICONS: Record<string, string> = {
  'Very Easy': '$(circle-small)',
  Easy: '$(circle-outline)',
  Medium: '$(circle-filled)',
  Hard: '$(error)',
};

const DIFFICULTY_COLORS: Record<string, vscode.ThemeColor> = {
  'Very Easy': new vscode.ThemeColor('charts.green'),
  Easy: new vscode.ThemeColor('charts.blue'),
  Medium: new vscode.ThemeColor('charts.yellow'),
  Hard: new vscode.ThemeColor('charts.red'),
};

class CategoryItem extends vscode.TreeItem {
  constructor(
    public readonly category: string,
    public readonly sherlocks: HtbSherlock[],
  ) {
    const solved = sherlocks.filter((s) => s.isSolved).length;
    super(`${category} (${solved}/${sherlocks.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('shield');
    this.contextValue = 'sherlockCategory';
  }
}

class SherlockItem extends vscode.TreeItem {
  constructor(public readonly sherlock: HtbSherlock) {
    super(sherlock.name, vscode.TreeItemCollapsibleState.None);
    const icon = DIFFICULTY_ICONS[sherlock.difficulty] ?? '$(circle)';
    const color = DIFFICULTY_COLORS[sherlock.difficulty];
    this.description = `${sherlock.difficulty} · ${sherlock.points}pts`;
    this.iconPath = new vscode.ThemeIcon(
      sherlock.isSolved ? 'pass-filled' : icon.replace(/\$\(|\)/g, ''),
      sherlock.isSolved ? new vscode.ThemeColor('charts.green') : color,
    );
    this.tooltip = new vscode.MarkdownString(
      [
        `**${sherlock.name}**`,
        `Category: ${sherlock.category} | Difficulty: ${sherlock.difficulty}`,
        sherlock.description ? `\n\n${sherlock.description}` : '',
      ].join('\n'),
    );
    this.contextValue = sherlock.isSolved ? 'sherlockSolved' : 'sherlockUnsolved';
    this.command = {
      command: 'htb.sherlocks.open',
      title: 'Open Sherlock',
      arguments: [sherlock],
    };
  }
}

type SherlockTreeItem = CategoryItem | SherlockItem;

export class SherlocksProvider implements vscode.TreeDataProvider<SherlockTreeItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;

  private _sherlocks: HtbSherlock[] = [];
  private _loading = false;

  update(sherlocks: HtbSherlock[]): void {
    this._sherlocks = sherlocks;
    this._onChange.fire();
  }

  setLoading(loading: boolean): void {
    this._loading = loading;
    this._onChange.fire();
  }

  getTreeItem(el: SherlockTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(parent?: SherlockTreeItem): SherlockTreeItem[] {
    if (this._loading) {
      const item = new vscode.TreeItem('Loading Sherlocks…');
      item.iconPath = new vscode.ThemeIcon('loading~spin');
      return [item as SherlockTreeItem];
    }

    if (!parent) {
      if (this._sherlocks.length === 0) {
        const empty = new vscode.TreeItem('Sign in to load Sherlocks');
        empty.iconPath = new vscode.ThemeIcon('info');
        return [empty as SherlockTreeItem];
      }
      return this.buildCategories();
    }

    if (parent instanceof CategoryItem) {
      return parent.sherlocks.map((s) => new SherlockItem(s));
    }

    return [];
  }

  private buildCategories(): CategoryItem[] {
    const map = new Map<string, HtbSherlock[]>();
    for (const s of this._sherlocks) {
      const cat = s.category || 'Uncategorized';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, list]) => new CategoryItem(cat, list));
  }
}
