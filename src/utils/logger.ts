import * as vscode from 'vscode';

export type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug: (msg: string) => void;
  show: () => void;
  dispose: () => void;
};

export function createLogger(channelName: string): Logger {
  const channel = vscode.window.createOutputChannel(channelName);

  return {
    info: (msg) => channel.appendLine(`[INFO]  ${new Date().toISOString()} ${msg}`),
    warn: (msg) => channel.appendLine(`[WARN]  ${new Date().toISOString()} ${msg}`),
    error: (msg) => channel.appendLine(`[ERROR] ${new Date().toISOString()} ${msg}`),
    debug: (msg) => channel.appendLine(`[DEBUG] ${new Date().toISOString()} ${msg}`),
    show: () => channel.show(),
    dispose: () => channel.dispose(),
  };
}
