export interface EnumFinding {
  type: 'port' | 'directory' | 'subdomain' | 'user' | 'credential' | 'cve' | 'note';
  value: string;
  source: string;
  confidence: 'low' | 'medium' | 'high';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CommandLogEntry {
  timestamp: string;
  command: string;
  cwd: string;
  section?: string;
  exitCode?: number;
  output?: string;
}
