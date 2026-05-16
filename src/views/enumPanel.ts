import * as vscode from 'vscode';
import type { EnumFinding } from '../types/findings.js';

// ─── Tree Items ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  port: 'plug',
  directory: 'folder',
  subdomain: 'globe',
  user: 'person',
  credential: 'key',
  cve: 'bug',
  note: 'note',
};

const CATEGORY_LABELS: Record<string, string> = {
  port: 'Ports',
  directory: 'Directories',
  subdomain: 'Subdomains',
  user: 'Users / Creds',
  credential: 'Users / Creds',
  cve: 'CVE Candidates',
  note: 'Notes',
};

const DISPLAY_CATEGORIES = ['port', 'directory', 'subdomain', 'user', 'credential', 'cve', 'note'];

class CategoryItem extends vscode.TreeItem {
  constructor(
    public readonly category: string,
    public readonly findings: EnumFinding[],
  ) {
    const label = CATEGORY_LABELS[category] ?? category;
    super(`${label} (${findings.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(CATEGORY_ICONS[category] ?? 'list-flat');
    this.contextValue = 'enumCategory';
  }
}

class FindingItem extends vscode.TreeItem {
  constructor(public readonly finding: EnumFinding) {
    super(finding.value, vscode.TreeItemCollapsibleState.None);

    if (finding.type === 'port') {
      const svc = finding.metadata?.['service'] as string | undefined;
      const ver = finding.metadata?.['version'] as string | undefined;
      this.description = [svc, ver].filter(Boolean).join(' ');
    } else if (finding.type === 'directory' || finding.type === 'subdomain') {
      const status = finding.metadata?.['status'] as number | undefined;
      this.description = status ? `[${status}]` : '';
    } else {
      this.description = finding.source;
    }

    this.iconPath = new vscode.ThemeIcon(
      finding.confidence === 'high'
        ? 'circle-filled'
        : finding.confidence === 'medium'
          ? 'circle-outline'
          : 'circle-small',
    );
    this.tooltip = new vscode.MarkdownString(
      `**${finding.value}**\n\n` +
        `Type: ${finding.type} | Source: ${finding.source} | Confidence: ${finding.confidence}\n\n` +
        `Discovered: ${new Date(finding.timestamp).toLocaleString()}`,
    );
    this.contextValue = `enumFinding_${finding.type}`;

    this.command = {
      command: 'htb.enum.copyFinding',
      title: 'Copy',
      arguments: [finding.value],
    };
  }
}

type EnumTreeItem = CategoryItem | FindingItem;

// ─── Provider ─────────────────────────────────────────────────────────────────

export class EnumerationProvider implements vscode.TreeDataProvider<EnumTreeItem> {
  private _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;

  private _findings: EnumFinding[] = [];

  update(findings: EnumFinding[]): void {
    this._findings = findings;
    this._onChange.fire();
  }

  addFindings(newFindings: EnumFinding[]): void {
    const existing = new Set(this._findings.map((f) => `${f.type}:${f.value}:${f.source}`));
    const deduped = newFindings.filter((f) => !existing.has(`${f.type}:${f.value}:${f.source}`));
    this._findings = [...this._findings, ...deduped];
    this._onChange.fire();
  }

  clear(): void {
    this._findings = [];
    this._onChange.fire();
  }

  get findings(): ReadonlyArray<EnumFinding> {
    return this._findings;
  }

  getTreeItem(el: EnumTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(parent?: EnumTreeItem): EnumTreeItem[] {
    if (!parent) {
      return this.buildCategories();
    }
    if (parent instanceof CategoryItem) {
      return parent.findings.map((f) => new FindingItem(f));
    }
    return [];
  }

  private buildCategories(): CategoryItem[] {
    const grouped = new Map<string, EnumFinding[]>();
    for (const cat of DISPLAY_CATEGORIES) {
      grouped.set(cat, []);
    }
    for (const f of this._findings) {
      const cat = f.type === 'credential' ? 'credential' : f.type;
      const bucket = grouped.get(cat) ?? grouped.get('note')!;
      bucket.push(f);
    }

    const items: CategoryItem[] = [];
    for (const [cat, list] of grouped) {
      if (cat === 'credential') {
        continue;
      }
      if (cat === 'user') {
        const combined = [...(grouped.get('user') ?? []), ...(grouped.get('credential') ?? [])];
        if (combined.length > 0) {
          items.push(new CategoryItem('user', combined));
        }
        continue;
      }
      if (list.length > 0) {
        items.push(new CategoryItem(cat, list));
      }
    }
    return items;
  }
}

// ─── Import command logic ──────────────────────────────────────────────────────

export async function importOutputToFindings(
  output: string,
  provider: EnumerationProvider,
): Promise<number> {
  const { parseNmapText } = await import('../services/parsers/nmap.js');
  const { parseGobusterOutput } = await import('../services/parsers/gobuster.js');
  const { parseFfufJson, parseFfufText } = await import('../services/parsers/ffuf.js');

  let findings: EnumFinding[] = [];

  if (/^\d+\/(tcp|udp)\s+open/m.test(output) || /^Starting Nmap/m.test(output)) {
    findings = parseNmapText(output);
  } else if (/^Found:|^\//m.test(output)) {
    findings = parseGobusterOutput(output);
  } else {
    try {
      findings = parseFfufJson(output);
    } catch {
      findings = parseFfufText(output);
    }
  }

  if (findings.length > 0) {
    provider.addFindings(findings);
  }
  return findings.length;
}
