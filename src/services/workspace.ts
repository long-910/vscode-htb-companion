import * as vscode from 'vscode';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { HtbMachine } from '../types/htb.js';
import { getWorkspaceRoot, getWorkspaceTemplate } from '../utils/config.js';
import type { Logger } from '../utils/logger.js';

interface BoxMeta {
  id: number;
  name: string;
  os: string;
  difficulty: string;
  ip: string;
  spawnedAt: string;
}

function expandHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function writeIfAbsent(p: string, content: string): Promise<void> {
  try {
    await access(p);
  } catch {
    await writeFile(p, content, 'utf-8');
  }
}

function substituteTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export class WorkspaceService {
  constructor(
    private readonly extensionRoot: string,
    private readonly logger: Logger,
  ) {}

  private async loadTemplate(name: string): Promise<string> {
    try {
      return await readFile(join(this.extensionRoot, 'resources', 'templates', name), 'utf-8');
    } catch {
      return '';
    }
  }

  async scaffoldBoxWorkspace(machine: HtbMachine, ip: string): Promise<string> {
    const root = expandHome(getWorkspaceRoot());
    const boxDir = join(root, machine.name);
    const template = getWorkspaceTemplate();
    const spawnedAt = new Date().toISOString();

    this.logger.info(`Scaffolding workspace for ${machine.name} at ${boxDir}`);

    for (const d of this.getDirs(boxDir, template)) {
      await ensureDir(d);
    }

    const meta: BoxMeta = {
      id: machine.id,
      name: machine.name,
      os: machine.os,
      difficulty: machine.difficulty,
      ip,
      spawnedAt,
    };
    await writeFile(join(boxDir, '.htb', 'box.json'), JSON.stringify(meta, null, 2), 'utf-8');
    await writeIfAbsent(join(boxDir, '.htb', 'commands.jsonl'), '');
    await writeIfAbsent(join(boxDir, '.htb', 'findings.json'), '[]');

    const vars: Record<string, string> = {
      BOX_NAME: machine.name,
      TARGET_IP: ip,
      OS: machine.os,
      DIFFICULTY: machine.difficulty,
      SPAWN_TIME: spawnedAt,
      USER_FLAG: '',
      ROOT_FLAG: '',
      OWN_DATE: '',
      AI_SUMMARY: '<!-- AI-generated summary goes here -->',
      NMAP_COMMAND: `nmap -sCV -p- -T4 ${ip} -oA scans/nmap/initial`,
      NMAP_OUTPUT_FORMATTED: '',
      COMMAND_LOG_FOOTHOLD: '',
      COMMAND_LOG_PRIVESC: '',
      USER_NOTES: '',
    };

    const notesTpl = await this.loadTemplate('notes.md');
    await writeIfAbsent(join(boxDir, 'notes.md'), substituteTemplate(notesTpl, vars));

    const writeupTpl = await this.loadTemplate('writeup.md');
    await writeIfAbsent(join(boxDir, 'writeup.md'), substituteTemplate(writeupTpl, vars));

    await this.writeVscodeFiles(boxDir, ip);
    this.logger.info(`Workspace ready: ${boxDir}`);
    return boxDir;
  }

  private getDirs(boxDir: string, template: string): string[] {
    const dirs = [
      join(boxDir, '.htb'),
      join(boxDir, '.vscode'),
      join(boxDir, 'scans', 'nmap'),
      join(boxDir, 'scans', 'web'),
      join(boxDir, 'scans', 'smb'),
      join(boxDir, 'loot'),
    ];
    if (template === 'full') {
      dirs.push(join(boxDir, 'exploits'), join(boxDir, 'screenshots'));
    }
    return dirs;
  }

  private async writeVscodeFiles(boxDir: string, ip: string): Promise<void> {
    const tasksTpl = await this.loadTemplate('tasks.json');
    await writeIfAbsent(join(boxDir, '.vscode', 'tasks.json'), tasksTpl);

    const settings = {
      'htb.targetIp': ip,
      'terminal.integrated.env.linux': { HTB_TARGET: ip },
      'terminal.integrated.env.osx': { HTB_TARGET: ip },
      'terminal.integrated.env.windows': { HTB_TARGET: ip },
    };
    await writeIfAbsent(
      join(boxDir, '.vscode', 'settings.json'),
      JSON.stringify(settings, null, 2),
    );

    const credsMd =
      '# Credentials\n\n| Username | Password | Service | Notes |\n|----------|----------|---------|-------|\n|          |          |         |       |\n';
    await writeIfAbsent(join(boxDir, 'loot', 'credentials.md'), credsMd);
  }

  async openBoxWorkspace(boxDir: string): Promise<void> {
    const uri = vscode.Uri.file(boxDir);
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
  }
}
