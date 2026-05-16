import * as vscode from 'vscode';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { homedir, platform } from 'node:os';
import { getConfig } from '../utils/config.js';
import type { Logger } from '../utils/logger.js';

export type VpnState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ElevationStrategy = 'none' | 'sudo' | 'pkexec' | 'osascript' | 'runas';

interface VpnSession {
  process: ChildProcess;
  ovpnPath: string;
  server: string;
  startedAt: Date;
}

const PASSWORD_MASK = /(?:password|passwd|key)\s*[:=]\s*\S+/gi;

function expandHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function which(bin: string): Promise<string | null> {
  const cmd = platform() === 'win32' ? 'where' : 'which';
  return new Promise((resolve) => {
    execFile(cmd, [bin], (_err, stdout) => {
      const p = stdout.trim().split('\n')[0]?.trim() ?? '';
      resolve(p.length > 0 ? p : null);
    });
  });
}

export async function findOpenvpnBinary(): Promise<string | null> {
  const fromConfig = getConfig().get<string>('vpn.openvpnPath', '');
  if (fromConfig && (await fileExists(fromConfig))) {
    return fromConfig;
  }

  const candidates: Record<string, string[]> = {
    linux: ['/usr/sbin/openvpn', '/usr/bin/openvpn'],
    darwin: ['/opt/homebrew/sbin/openvpn', '/usr/local/sbin/openvpn', '/opt/local/sbin/openvpn'],
    win32: [
      'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe',
      'C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe',
    ],
  };

  for (const p of candidates[platform()] ?? []) {
    if (await fileExists(p)) {
      return p;
    }
  }
  return which('openvpn');
}

export function detectElevationStrategy(): ElevationStrategy {
  const cfg = getConfig().get<string>('vpn.elevationStrategy', 'auto');
  if (cfg !== 'auto') {
    return cfg as ElevationStrategy;
  }

  const os = platform();
  if (os === 'win32') {
    return 'runas';
  }
  if (os === 'darwin') {
    return 'osascript';
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1;
  return uid === 0 ? 'none' : 'sudo';
}

function buildCommand(
  strategy: ElevationStrategy,
  openvpnBin: string,
  ovpnPath: string,
  pidFile: string,
): [string, string[]] {
  const vpnArgs = ['--config', ovpnPath, '--writepid', pidFile, '--verb', '3'];
  switch (strategy) {
    case 'none':
      return [openvpnBin, vpnArgs];
    case 'sudo':
      return ['sudo', [openvpnBin, ...vpnArgs]];
    case 'pkexec':
      return ['pkexec', [openvpnBin, ...vpnArgs]];
    case 'osascript': {
      const shellCmd = [openvpnBin, ...vpnArgs].map((a) => `"${a}"`).join(' ');
      return ['osascript', ['-e', `do shell script "${shellCmd}" with administrator privileges`]];
    }
    case 'runas':
      return [openvpnBin, vpnArgs];
  }
}

export class VpnService {
  private _state: VpnState = 'disconnected';
  private _session: VpnSession | undefined;
  private _healthTimer: ReturnType<typeof setInterval> | undefined;

  private readonly _onStateChange = new vscode.EventEmitter<VpnState>();
  readonly onStateChange = this._onStateChange.event;

  constructor(private readonly logger: Logger) {}

  get state(): VpnState {
    return this._state;
  }

  get currentServer(): string | undefined {
    return this._session?.server;
  }

  async selectAndConnect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      const confirm = await vscode.window.showWarningMessage(
        'VPN is already active. Disconnect first?',
        'Disconnect',
        'Cancel',
      );
      if (confirm !== 'Disconnect') {
        return;
      }
      await this.disconnect();
    }
    const ovpnPath = await this.pickOvpnFile();
    if (ovpnPath) {
      await this.connect(ovpnPath);
    }
  }

  private async pickOvpnFile(): Promise<string | undefined> {
    const defaultCfg = getConfig().get<string>('vpn.defaultConfig', '');
    if (defaultCfg) {
      const expanded = expandHome(defaultCfg);
      if (await fileExists(expanded)) {
        return expanded;
      }
    }

    const cfgDir = expandHome(getConfig().get<string>('vpn.configDirectory', '~/htb/vpn'));
    let files: string[] = [];
    try {
      const entries = await readdir(cfgDir);
      files = entries.filter((f) => extname(f) === '.ovpn').map((f) => join(cfgDir, f));
    } catch {
      /* dir may not exist */
    }

    const items: vscode.QuickPickItem[] = [
      ...files.map((f) => ({ label: f.split(/[/\\]/).pop() ?? f, description: f })),
      { label: '$(folder-opened) Browse…', description: '__browse__' },
    ];

    const pick = await vscode.window.showQuickPick(items, {
      title: 'Select VPN Configuration',
      placeHolder: 'Choose a .ovpn file',
    });
    if (!pick) {
      return undefined;
    }

    if (pick.description === '__browse__') {
      const uris = await vscode.window.showOpenDialog({
        filters: { 'OpenVPN Config': ['ovpn'] },
        canSelectMany: false,
      });
      return uris?.[0]?.fsPath;
    }
    return pick.description;
  }

  async connect(ovpnPath: string): Promise<void> {
    const bin = await findOpenvpnBinary();
    if (!bin) {
      void vscode.window.showErrorMessage(
        'OpenVPN binary not found. Install OpenVPN and configure htb.vpn.openvpnPath.',
      );
      return;
    }

    const content = await readFile(ovpnPath, 'utf-8').catch(() => '');
    if (/\bscript-security\s+[2-9]\b/i.test(content)) {
      const ok = await vscode.window.showWarningMessage(
        'This .ovpn file uses script-security ≥2 which can execute arbitrary commands. Proceed?',
        { modal: true },
        'Connect Anyway',
      );
      if (ok !== 'Connect Anyway') {
        return;
      }
    }

    const strategy = detectElevationStrategy();
    const pidFile = join(homedir(), '.htb-companion-openvpn.pid');
    const [cmd, args] = buildCommand(strategy, bin, ovpnPath, pidFile);

    this.setState('connecting');
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const serverLabel = ovpnPath.split(/[/\\]/).pop()?.replace('.ovpn', '') ?? 'VPN';
    this._session = { process: proc, ovpnPath, server: serverLabel, startedAt: new Date() };

    proc.stdout?.on('data', (chunk: Buffer) => this.handleOutput(chunk.toString()));
    proc.stderr?.on('data', (chunk: Buffer) => this.handleOutput(chunk.toString()));
    proc.on('exit', (code) => this.handleExit(code));
    this.logger.info(`OpenVPN started (PID ${proc.pid}, strategy: ${strategy})`);
  }

  private handleOutput(raw: string): void {
    const masked = raw.replace(PASSWORD_MASK, (m) => m.replace(/[:=]\s*\S+/, '=***'));
    for (const line of masked.split('\n').filter(Boolean)) {
      this.logger.debug(`[ovpn] ${line}`);
    }
    if (/Initialization Sequence Completed/i.test(raw)) {
      this.setState('connected');
      void vscode.window.showInformationMessage(
        `HTB VPN connected: ${this._session?.server ?? 'VPN'}`,
      );
      this.startHealthCheck();
    } else if (/AUTH_FAILED|TLS Error|Cannot open TUN/i.test(raw)) {
      this.setState('error');
      void vscode.window.showErrorMessage(`VPN error: ${raw.trim().slice(0, 120)}`);
    }
  }

  private handleExit(code: number | null): void {
    this.stopHealthCheck();
    this._session = undefined;
    if (this._state !== 'error') {
      this.setState('disconnected');
    }
    this.logger.info(`OpenVPN exited (code ${code})`);
  }

  async disconnect(): Promise<void> {
    if (!this._session) {
      return;
    }
    this.stopHealthCheck();
    const { process: proc } = this._session;
    proc.kill('SIGTERM');

    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 10_000);
      proc.once('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });

    this._session = undefined;
    this.setState('disconnected');
    this.logger.info('VPN disconnected');
  }

  private startHealthCheck(): void {
    const sec = getConfig().get<number>('vpn.healthCheckIntervalSec', 10);
    this._healthTimer = setInterval(() => this.runHealthCheck(), sec * 1_000);
  }

  private stopHealthCheck(): void {
    if (this._healthTimer !== undefined) {
      clearInterval(this._healthTimer);
      this._healthTimer = undefined;
    }
  }

  private runHealthCheck(): void {
    const pid = this._session?.process.pid;
    if (!pid) {
      return;
    }
    try {
      process.kill(pid, 0);
    } catch {
      this.logger.warn('VPN health check failed: process gone');
      this.stopHealthCheck();
      this._session = undefined;
      this.setState('disconnected');
    }
  }

  private setState(state: VpnState): void {
    this._state = state;
    this._onStateChange.fire(state);
  }

  dispose(): void {
    void this.disconnect();
    this._onStateChange.dispose();
  }
}
