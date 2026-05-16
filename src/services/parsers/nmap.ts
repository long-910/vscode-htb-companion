import type { EnumFinding } from '../../types/findings.js';

const PORT_LINE = /^(\d+)\/(tcp|udp)\s+(open|filtered|closed)\s+(\S+)(?:\s+(.+))?$/gm;
const OS_HINT = /^OS details?:\s+(.+)$/im;
const HTTP_TITLE = /\|_http-title:\s+(.+)$/m;

export function parseNmapText(output: string): EnumFinding[] {
  const findings: EnumFinding[] = [];
  const ts = new Date().toISOString();

  for (const m of output.matchAll(PORT_LINE)) {
    const [, port, proto, state, service, versionRaw] = m;
    if (state !== 'open') {
      continue;
    }
    const version = versionRaw?.trim();
    findings.push({
      type: 'port',
      value: `${port}/${proto}`,
      source: 'nmap',
      confidence: 'high',
      timestamp: ts,
      metadata: { service, version: version ?? '', state },
    });
  }

  const osMatch = OS_HINT.exec(output);
  if (osMatch) {
    findings.push({
      type: 'note',
      value: osMatch[1].trim(),
      source: 'nmap',
      confidence: 'medium',
      timestamp: ts,
      metadata: { kind: 'os-detection' },
    });
  }

  const titleMatch = HTTP_TITLE.exec(output);
  if (titleMatch && titleMatch[1] !== "Site doesn't have a title") {
    findings.push({
      type: 'note',
      value: `HTTP title: ${titleMatch[1].trim()}`,
      source: 'nmap',
      confidence: 'high',
      timestamp: ts,
      metadata: { kind: 'http-title' },
    });
  }

  return findings;
}

export function parseNmapXml(xml: string): EnumFinding[] {
  const findings: EnumFinding[] = [];
  const ts = new Date().toISOString();

  const portMatches = xml.matchAll(
    /<port protocol="(\w+)" portid="(\d+)"[^>]*>.*?<state state="(\w+)"[^/]*/gs,
  );
  for (const m of portMatches) {
    const [, proto, port, state] = m;
    if (state !== 'open') {
      continue;
    }
    const serviceMatch = m[0].match(
      /name="([^"]+)"(?:[^>]*product="([^"]+)")?(?:[^>]*version="([^"]+)")?/,
    );
    const service = serviceMatch?.[1] ?? '';
    const version = [serviceMatch?.[2], serviceMatch?.[3]].filter(Boolean).join(' ');
    findings.push({
      type: 'port',
      value: `${port}/${proto}`,
      source: 'nmap',
      confidence: 'high',
      timestamp: ts,
      metadata: { service, version, state },
    });
  }

  return findings;
}
