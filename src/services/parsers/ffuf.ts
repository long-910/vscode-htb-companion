import type { EnumFinding } from '../../types/findings.js';

interface FfufResult {
  input?: Record<string, string>;
  position?: number;
  status: number;
  length: number;
  words: number;
  lines: number;
  content_type?: string;
  redirectlocation?: string;
  url: string;
  duration?: number;
  resultfile?: string;
  host?: string;
}

interface FfufJson {
  commandline?: string;
  time?: string;
  results?: FfufResult[];
}

export function parseFfufJson(json: string): EnumFinding[] {
  const findings: EnumFinding[] = [];
  const ts = new Date().toISOString();

  let parsed: FfufJson;
  try {
    parsed = JSON.parse(json) as FfufJson;
  } catch {
    return [];
  }

  for (const result of parsed.results ?? []) {
    if (result.status >= 400 && result.status !== 401 && result.status !== 403) {
      continue;
    }

    const url = result.url ?? '';
    const fuzz = result.input?.['FUZZ'] ?? result.input?.['fuzz'] ?? '';

    const isVhost = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(fuzz) && !fuzz.includes('/');

    findings.push({
      type: isVhost ? 'subdomain' : 'directory',
      value: isVhost ? fuzz : url,
      source: 'ffuf',
      confidence: 'high',
      timestamp: ts,
      metadata: {
        status: result.status,
        length: result.length,
        words: result.words,
        lines: result.lines,
        contentType: result.content_type ?? '',
        redirect: result.redirectlocation ?? '',
      },
    });
  }

  return findings;
}

/** Also accept plain-text ffuf output (no -of json) as a best-effort parse */
export function parseFfufText(output: string): EnumFinding[] {
  const findings: EnumFinding[] = [];
  const ts = new Date().toISOString();

  // [Status: 200, Size: 1234, Words: 100, Lines: 40, Duration: 12ms]
  const LINE = /^(\S+)\s+\[Status:\s*(\d+),\s*Size:\s*(\d+)/m;
  for (const line of output.split('\n')) {
    const m = LINE.exec(line.trim());
    if (!m) {
      continue;
    }
    const status = parseInt(m[2], 10);
    if (status >= 400 && status !== 401 && status !== 403) {
      continue;
    }
    findings.push({
      type: 'directory',
      value: m[1],
      source: 'ffuf',
      confidence: 'medium',
      timestamp: ts,
      metadata: { status, size: parseInt(m[3], 10) },
    });
  }

  return findings;
}
