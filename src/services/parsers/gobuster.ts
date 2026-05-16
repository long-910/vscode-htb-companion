import type { EnumFinding } from '../../types/findings.js';

// gobuster dir:  /path                 (Status: 200) [Size: 1234]
// gobuster dns:  Found: sub.domain.htb
// gobuster vhost: Found: sub.domain.htb (Status: 200) [Size: 1234]
const DIR_LINE = /^(\/\S*)\s+\(Status:\s*(\d+)\)/m;
const DNS_LINE = /^Found:\s+(\S+)/m;
const VHOST_LINE = /^Found:\s+(\S+)\s+\(Status:\s*(\d+)\)/m;

function detectMode(output: string): 'dir' | 'dns' | 'vhost' | 'unknown' {
  if (/\(Status:\s*\d+\)/.test(output) && /^\//.test(output.trim())) {
    return 'dir';
  }
  if (/^Found:/.test(output) && /\(Status:/.test(output)) {
    return 'vhost';
  }
  if (/^Found:/.test(output)) {
    return 'dns';
  }
  return 'unknown';
}

export function parseGobusterOutput(output: string): EnumFinding[] {
  const findings: EnumFinding[] = [];
  const ts = new Date().toISOString();
  const mode = detectMode(output);

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('[')) {
      continue;
    }

    if (mode === 'dir') {
      const m = DIR_LINE.exec(trimmed);
      if (m) {
        const status = parseInt(m[2], 10);
        if (status < 400 || status === 401 || status === 403) {
          findings.push({
            type: 'directory',
            value: m[1],
            source: 'gobuster',
            confidence: 'high',
            timestamp: ts,
            metadata: { status },
          });
        }
      }
    } else if (mode === 'vhost') {
      const m = VHOST_LINE.exec(trimmed);
      if (m) {
        findings.push({
          type: 'subdomain',
          value: m[1],
          source: 'gobuster',
          confidence: 'high',
          timestamp: ts,
          metadata: { status: parseInt(m[2], 10) },
        });
      }
    } else if (mode === 'dns') {
      const m = DNS_LINE.exec(trimmed);
      if (m) {
        findings.push({
          type: 'subdomain',
          value: m[1],
          source: 'gobuster',
          confidence: 'high',
          timestamp: ts,
          metadata: {},
        });
      }
    }
  }

  return findings;
}
