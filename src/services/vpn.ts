import * as vscode from 'vscode';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { access, readdir, readFile, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { homedir, platform } from 'node:os';
import { getConfig } from '../utils/config.js';
import type { Logger } from '../utils/logger.js';

export type VpnState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ElevationStrategy = 'none' | 'sudo' | 'pkexec' | 'osascript' | 'runas';

interface VpnSession {
  process: ChildProcess | undefined;
  terminal: vscode.Terminal | undefined;
  ovpnPath: string;
  server: string;
  startedAt: Date;
}

const PASSWORD_MASK = /(?:password|passwd|key)\s*[:=]\s*\S+/gi;
const PID_FILE = join(homedir(), '.htb-companion-openvpn.pid');
const LOG_FILE = join(homedir(), '.htb-companion-openvpn.log');

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

// Shell-escape a single argument (single-quote style).
function shellEsc(s: string): string {
  return `'${s.replace(/'/g, `'"'"'`)}'`;
}

function buildCommand(
  strategy: Exclude<ElevationStrategy, 'osascript'>,
  openvpnBin: string,
  ovpnPath: string,
): [string, string[]] {
  const vpnArgs = ['--config', ovpnPath, '--writepid', PID_FILE, '--verb', '3'];

  switch (strategy) {
    case 'none':
      return [openvpnBin, vpnArgs];
    case 'sudo':
      return ['sudo', [openvpnBin, ...vpnArgs]];
    case 'pkexec':
      return ['pkexec', [openvpnBin, ...vpnArgs]];
    case 'runas':
      return [openvpnBin, vpnArgs];
  }
}

export class VpnService {
  private _state: VpnState = 'disconnected';
  private _session: VpnSession | undefined;
  private _strategy: ElevationStrategy = 'none';
  private _healthTimer: ReturnType<typeof setInterval> | undefined;
  private _pollTimer: ReturnType<typeof setTimeout> | undefined;

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
        'OpenVPN binary not found. Install OpenVPN and set htb.vpn.openvpnPath if needed.',
      );
      return;
    }

    const content = await readFile(ovpnPath, 'utf-8').catch(() => '');
    if (/\bscript-security\s+[2-9]\b/i.test(content)) {
      const ok = await vscode.window.showWarningMessage(
        'This .ovpn file uses script-security ≥2, which can execute arbitrary commands. Proceed?',
        { modal: true },
        'Connect Anyway',
      );
      if (ok !== 'Connect Anyway') {
        return;
      }
    }

    this._strategy = detectElevationStrategy();
    const serverLabel = ovpnPath.split(/[/\\]/).pop()?.replace('.ovpn', '') ?? 'VPN';

    this.setState('connecting');
    this.logger.info(`Connecting VPN: ${serverLabel} (strategy: ${this._strategy})`);

    await unlink(LOG_FILE).catch(() => undefined);
    await unlink(PID_FILE).catch(() => undefined);

    if (this._strategy === 'osascript') {
      // macOS: run sudo openvpn in an integrated terminal so the user can
      // enter their sudo password. Use --log so OpenVPN writes directly to
      // LOG_FILE (avoids pipe-buffering delays). The terminal stays open so
      // the user sees the sudo prompt and any runtime output.
      const vpnArgs = [
        bin,
        '--config',
        ovpnPath,
        '--writepid',
        PID_FILE,
        '--log',
        LOG_FILE,
        '--verb',
        '3',
      ];
      const cmd = `sudo ${vpnArgs.map(shellEsc).join(' ')}`;

      const terminal = vscode.window.createTerminal({ name: 'HTB VPN' });
      terminal.show();

      // Delay sending the command to give the shell time to initialise.
      setTimeout(() => terminal.sendText(cmd), 400);

      void vscode.window.showInformationMessage(
        'HTB VPN: Enter your sudo password in the "HTB VPN" terminal.',
      );

      this._session = {
        process: undefined,
        terminal,
        ovpnPath,
        server: serverLabel,
        startedAt: new Date(),
      };
      this.logger.info('OpenVPN started in integrated terminal (--log); polling log file');
      // Start polling after the shell has had time to launch openvpn.
      setTimeout(() => this.startLogFilePoll(), 500);
      return;
    }

    const [cmd, args] = buildCommand(this._strategy, bin, ovpnPath);
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this._session = {
      process: proc,
      terminal: undefined,
      ovpnPath,
      server: serverLabel,
      startedAt: new Date(),
    };

    proc.stdout?.on('data', (chunk: Buffer) => this.handleOutput(chunk.toString()));
    proc.stderr?.on('data', (chunk: Buffer) => this.handleOutput(chunk.toString()));
    proc.on('exit', (code) => this.handleExit(code));
    proc.on('error', (e) => {
      this.setState('error');
      void vscode.window.showErrorMessage(`VPN launch error: ${e.message}`);
    });

    this.logger.info(`OpenVPN spawned (PID ${proc.pid ?? '?'})`);
  }

  // ── Log file polling (macOS terminal path) ────────────────────────────────

  private startLogFilePoll(): void {
    const startTime = Date.now();
    const TIMEOUT_MS = 90_000;
    let lastSize = 0;

    const poll = async () => {
      if (this._state !== 'connecting') {
        return;
      }

      if (Date.now() - startTime > TIMEOUT_MS) {
        this.setState('error');
        void vscode.window.showErrorMessage(
          'VPN connection timed out (90 s). Check the HTB VPN terminal for errors.',
        );
        return;
      }

      try {
        const content = await readFile(LOG_FILE, 'utf-8');
        if (content.length > lastSize) {
          this.handleOutput(content.slice(lastSize));
          lastSize = content.length;
        }
      } catch {
        /* log not yet created */
      }

      if (this._state === 'connecting') {
        this._pollTimer = setTimeout(() => void poll(), 500);
      }
    };

    void poll();
  }

  private stopLogFilePoll(): void {
    if (this._pollTimer !== undefined) {
      clearTimeout(this._pollTimer);
      this._pollTimer = undefined;
    }
  }

  // ── Output handler (shared by stdout and log-file paths) ──────────────────

  private handleOutput(raw: string): void {
    const masked = raw.replace(PASSWORD_MASK, (m) => m.replace(/[:=]\s*\S+/, '=***'));
    for (const line of masked.split('\n').filter(Boolean)) {
      this.logger.debug(`[ovpn] ${line}`);
    }

    if (/Initialization Sequence Completed/i.test(raw)) {
      this.stopLogFilePoll();
      this.setState('connected');
      void vscode.window.showInformationMessage(
        `HTB VPN connected: ${this._session?.server ?? 'VPN'}`,
      );
      this.startHealthCheck();
    } else if (/AUTH_FAILED|TLS Error|Cannot open TUN/i.test(raw)) {
      this.stopLogFilePoll();
      this.setState('error');
      void vscode.window.showErrorMessage(`VPN error: ${masked.trim().slice(0, 160)}`);
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

  // ── Disconnect ────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    if (!this._session) {
      return;
    }

    this.stopHealthCheck();
    this.stopLogFilePoll();

    if (this._strategy === 'osascript') {
      // Close the terminal (sends HUP to the shell / sudo), then kill via PID file.
      this._session.terminal?.dispose();
      await this.killViaPidFile();
    } else {
      const proc = this._session.process;
      if (proc) {
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
      }
    }

    this._session = undefined;
    this.setState('disconnected');
    this.logger.info('VPN disconnected');
  }

  private async killViaPidFile(): Promise<void> {
    try {
      const pidStr = await readFile(PID_FILE, 'utf-8');
      const pid = parseInt(pidStr.trim(), 10);
      if (!isNaN(pid) && pid > 0) {
        // OpenVPN runs as root — use osascript to kill it with admin privileges.
        await new Promise<void>((resolve) => {
          const killer = spawn('osascript', [
            '-e',
            `do shell script "kill ${pid}" with administrator privileges`,
          ]);
          killer.on('exit', () => resolve());
          killer.on('error', () => resolve());
        });
        this.logger.info(`Sent kill to OpenVPN PID ${pid}`);
      }
    } catch {
      this.logger.warn('Could not read PID file for disconnect; process may already be gone.');
    }
  }

  // ── Health check ──────────────────────────────────────────────────────────

  private startHealthCheck(): void {
    const sec = getConfig().get<number>('vpn.healthCheckIntervalSec', 10);
    this._healthTimer = setInterval(() => void this.runHealthCheck(), sec * 1_000);
  }

  private stopHealthCheck(): void {
    if (this._healthTimer !== undefined) {
      clearInterval(this._healthTimer);
      this._healthTimer = undefined;
    }
  }

  private async runHealthCheck(): Promise<void> {
    let pid: number | undefined = this._session?.process?.pid;

    if (this._strategy === 'osascript') {
      try {
        const pidStr = await readFile(PID_FILE, 'utf-8');
        const n = parseInt(pidStr.trim(), 10);
        if (!isNaN(n) && n > 0) {
          pid = n;
        }
      } catch {
        pid = undefined;
      }
    }

    if (!pid) {
      return;
    }

    try {
      process.kill(pid, 0);
    } catch (e) {
      // EPERM means process exists but is owned by root — tunnel is still alive.
      if ((e as NodeJS.ErrnoException).code === 'EPERM') {
        return;
      }
      this.logger.warn('VPN health check failed: OpenVPN process gone');
      this.stopHealthCheck();
      this._session = undefined;
      this.setState('disconnected');
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private setState(state: VpnState): void {
    this._state = state;
    this._onStateChange.fire(state);
  }

  dispose(): void {
    void this.disconnect();
    this._onStateChange.dispose();
  }
}
