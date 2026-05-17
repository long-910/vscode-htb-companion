import * as vscode from 'vscode';
import type { EnumFinding } from '../types/findings.js';

let panel: vscode.WebviewPanel | undefined;

export function showVisualizerPanel(
  context: vscode.ExtensionContext,
  findings: ReadonlyArray<EnumFinding>,
  targetIp?: string,
  boxName?: string,
): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
  } else {
    panel = vscode.window.createWebviewPanel(
      'htbEnumVisualizer',
      'HTB Enumeration Map',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.onDidDispose(
      () => {
        panel = undefined;
      },
      null,
      context.subscriptions,
    );
  }

  panel.title = boxName ? `Enum Map — ${boxName}` : 'HTB Enumeration Map';
  panel.webview.html = buildHtml(findings, targetIp ?? '?', boxName ?? 'Unknown');
}

// ── Mermaid syntax builder ────────────────────────────────────────────────────

function buildMermaid(
  findings: ReadonlyArray<EnumFinding>,
  targetIp: string,
  boxName: string,
): string {
  const lines: string[] = ['graph LR', `  HOST["🖥 ${boxName}\\n${targetIp}"]`];

  const ports = findings.filter((f) => f.type === 'port');
  const dirs = findings.filter((f) => f.type === 'directory');
  const subs = findings.filter((f) => f.type === 'subdomain');
  const users = findings.filter((f) => f.type === 'user' || f.type === 'credential');
  const cves = findings.filter((f) => f.type === 'cve');

  const safe = (s: string) => s.replace(/["\[\](){}|]/g, '_').slice(0, 40);

  if (ports.length > 0) {
    lines.push('  subgraph Ports');
    for (const p of ports) {
      const svc = (p.metadata?.['service'] as string | undefined) ?? '';
      const id = `PORT_${safe(p.value)}`;
      lines.push(`    ${id}["${p.value}${svc ? ' ' + svc : ''}"]`);
      lines.push(`    HOST --> ${id}`);
    }
    lines.push('  end');
  }

  if (dirs.length > 0) {
    lines.push('  subgraph Directories');
    for (const d of dirs.slice(0, 20)) {
      const id = `DIR_${safe(d.value)}`;
      lines.push(`    ${id}["${safe(d.value)}"]`);
      lines.push(`    HOST --> ${id}`);
    }
    if (dirs.length > 20) {
      lines.push(`    DIR_more["… +${dirs.length - 20} more"]`);
    }
    lines.push('  end');
  }

  if (subs.length > 0) {
    lines.push('  subgraph Subdomains');
    for (const s of subs) {
      const id = `SUB_${safe(s.value)}`;
      lines.push(`    ${id}["${safe(s.value)}"]`);
      lines.push(`    HOST --> ${id}`);
    }
    lines.push('  end');
  }

  if (users.length > 0) {
    lines.push('  subgraph Users/Creds');
    for (const u of users) {
      const id = `USR_${safe(u.value)}`;
      lines.push(`    ${id}["${safe(u.value)}"]`);
      lines.push(`    HOST -.-> ${id}`);
    }
    lines.push('  end');
  }

  if (cves.length > 0) {
    lines.push('  subgraph CVEs');
    for (const c of cves) {
      const id = `CVE_${safe(c.value)}`;
      lines.push(`    ${id}["${safe(c.value)}"]:::vuln`);
      lines.push(`    HOST --> ${id}`);
    }
    lines.push('  end');
    lines.push('  classDef vuln fill:#ff4d4d,color:#fff');
  }

  return lines.join('\n');
}

// ── MITRE ATT&CK mapper ───────────────────────────────────────────────────────

interface MitreTactic {
  id: string;
  name: string;
  techniques: string[];
  reasons: string[];
}

const PORT_TACTIC_MAP: Record<string, { tactics: string[]; technique: string }> = {
  '21': { tactics: ['TA0001', 'TA0008'], technique: 'T1071.002 FTP' },
  '22': { tactics: ['TA0001', 'TA0008'], technique: 'T1021.004 SSH' },
  '23': { tactics: ['TA0008'], technique: 'T1021 Telnet' },
  '25': { tactics: ['TA0043'], technique: 'T1595 SMTP banner grab' },
  '80': { tactics: ['TA0043', 'TA0001'], technique: 'T1190 Web exploit / T1595 Recon' },
  '443': { tactics: ['TA0043', 'TA0001'], technique: 'T1190 Web exploit / T1595 Recon' },
  '445': { tactics: ['TA0001', 'TA0008', 'TA0006'], technique: 'T1021.002 SMB / T1187 NTLMv2' },
  '1433': { tactics: ['TA0001'], technique: 'T1190 MSSQL exploit' },
  '3306': { tactics: ['TA0001'], technique: 'T1190 MySQL exploit' },
  '3389': { tactics: ['TA0008'], technique: 'T1021.001 RDP' },
  '5985': { tactics: ['TA0008'], technique: 'T1021.006 WinRM' },
  '8080': { tactics: ['TA0043', 'TA0001'], technique: 'T1190 Web exploit' },
  '8443': { tactics: ['TA0043', 'TA0001'], technique: 'T1190 Web exploit' },
};

const TACTIC_META: Record<string, string> = {
  TA0043: 'Reconnaissance',
  TA0042: 'Resource Development',
  TA0001: 'Initial Access',
  TA0002: 'Execution',
  TA0003: 'Persistence',
  TA0004: 'Privilege Escalation',
  TA0005: 'Defense Evasion',
  TA0006: 'Credential Access',
  TA0007: 'Discovery',
  TA0008: 'Lateral Movement',
  TA0009: 'Collection',
  TA0010: 'Exfiltration',
  TA0011: 'Command and Control',
};

function buildMitreMapping(findings: ReadonlyArray<EnumFinding>): MitreTactic[] {
  const tacticMap = new Map<string, { techniques: Set<string>; reasons: Set<string> }>();

  const ensure = (id: string) => {
    if (!tacticMap.has(id)) {
      tacticMap.set(id, { techniques: new Set(), reasons: new Set() });
    }
    return tacticMap.get(id)!;
  };

  for (const f of findings) {
    if (f.type === 'port') {
      const portNum = f.value.split('/')[0] ?? '';
      const entry = PORT_TACTIC_MAP[portNum];
      if (entry) {
        for (const t of entry.tactics) {
          ensure(t).techniques.add(entry.technique);
          ensure(t).reasons.add(`Port ${f.value}`);
        }
      } else {
        ensure('TA0043').techniques.add('T1595 Active Scanning');
        ensure('TA0043').reasons.add(`Port ${f.value}`);
      }
    }

    if (f.type === 'directory') {
      ensure('TA0007').techniques.add('T1083 File & Directory Discovery');
      ensure('TA0007').reasons.add('Web directories found');
    }

    if (f.type === 'subdomain') {
      ensure('TA0043').techniques.add('T1596.001 DNS/Passive Recon');
      ensure('TA0043').reasons.add('Subdomains enumerated');
    }

    if (f.type === 'user') {
      ensure('TA0007').techniques.add('T1087 Account Discovery');
      ensure('TA0007').reasons.add(`User: ${f.value}`);
    }

    if (f.type === 'credential') {
      ensure('TA0006').techniques.add('T1110 Brute Force / T1552 Credentials');
      ensure('TA0001').techniques.add('T1078 Valid Accounts');
      ensure('TA0006').reasons.add(`Credential: ${f.value}`);
      ensure('TA0001').reasons.add(`Credential: ${f.value}`);
    }

    if (f.type === 'cve') {
      ensure('TA0001').techniques.add('T1190 Exploit Public-Facing Application');
      ensure('TA0001').reasons.add(`CVE: ${f.value}`);
    }
  }

  return [...tacticMap.entries()]
    .filter(([id]) => id in TACTIC_META)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, { techniques, reasons }]) => ({
      id,
      name: TACTIC_META[id] ?? id,
      techniques: [...techniques],
      reasons: [...reasons].slice(0, 3),
    }));
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(
  findings: ReadonlyArray<EnumFinding>,
  targetIp: string,
  boxName: string,
): string {
  const ports = findings.filter((f) => f.type === 'port');
  const dirs = findings.filter((f) => f.type === 'directory');
  const subs = findings.filter((f) => f.type === 'subdomain');
  const users = findings.filter((f) => f.type === 'user' || f.type === 'credential');
  const cves = findings.filter((f) => f.type === 'cve');
  const notes = findings.filter((f) => f.type === 'note');

  const portRows = ports
    .map((p) => {
      const [portNum, proto] = p.value.split('/');
      const svc = (p.metadata?.['service'] as string | undefined) ?? '';
      const ver = (p.metadata?.['version'] as string | undefined) ?? '';
      const conf = p.confidence === 'high' ? '🟢' : p.confidence === 'medium' ? '🟡' : '🔴';
      return `<tr><td>${conf} ${portNum ?? p.value}</td><td>${proto ?? ''}</td><td>${svc}</td><td class="ver">${ver}</td></tr>`;
    })
    .join('');

  const dirRows = dirs
    .slice(0, 50)
    .map((d) => {
      const status = (d.metadata?.['status'] as number | undefined) ?? '';
      return `<tr><td>${d.value}</td><td>${status}</td></tr>`;
    })
    .join('');

  const subRows = subs.map((s) => `<li>${s.value}</li>`).join('');
  const userRows = users.map((u) => `<li>${u.value}</li>`).join('');
  const cveRows = cves.map((c) => `<li class="cve">${c.value}</li>`).join('');
  const noteRows = notes.map((n) => `<li>${n.value}</li>`).join('');

  const mermaid = buildMermaid(findings, targetIp, boxName);
  const mitre = buildMitreMapping(findings);

  const section = (title: string, icon: string, content: string) =>
    content ? `<section><h2>${icon} ${title}</h2>${content}</section>` : '';

  const mitreRows = mitre
    .map(
      (t) =>
        `<tr>
          <td><span class="tactic-id">${t.id}</span></td>
          <td><strong>${t.name}</strong></td>
          <td class="ver">${t.techniques.join('<br>')}</td>
          <td class="ver muted">${t.reasons.join(', ')}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>HTB Enumeration Map</title>
<style>
  :root { --bg: #1e1e1e; --card: #252526; --border: #3c3c3c; --green: #9fef00; --text: #ccc; --muted: #888; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-editor-font-family, monospace); background: var(--bg); color: var(--text); font-size: 13px; padding: 16px; }
  header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  header h1 { font-size: 18px; color: var(--green); }
  header .ip { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 4px 10px; font-size: 13px; color: var(--green); letter-spacing: 1px; }
  header .badge { background: #333; border-radius: 4px; padding: 3px 8px; font-size: 11px; color: var(--muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
  section { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
  section h2 { font-size: 13px; color: var(--green); margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 6px; border-bottom: 1px solid #2a2a2a; vertical-align: top; }
  td:first-child { white-space: nowrap; }
  .ver { color: var(--muted); font-size: 11px; }
  .tactic-id { background: #2a3a1a; color: var(--green); border-radius: 3px; padding: 1px 5px; font-size: 10px; font-weight: bold; white-space: nowrap; }
  .muted { color: var(--muted); }
  ul { list-style: none; padding: 0; }
  ul li { padding: 3px 0; border-bottom: 1px solid #2a2a2a; word-break: break-all; }
  ul li.cve { color: #ff6b6b; font-weight: bold; }
  .mermaid-section { margin-top: 16px; }
  .mermaid-section h2 { font-size: 13px; color: var(--green); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  pre { background: #111; border: 1px solid var(--border); border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 12px; color: #aaa; white-space: pre; }
  button { background: #333; color: #ccc; border: 1px solid var(--border); border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px; }
  button:hover { background: #444; }
  .empty { color: var(--muted); font-style: italic; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>🗺 Enumeration Map</h1>
  <span class="ip">${targetIp}</span>
  <span class="badge">${boxName}</span>
  <span class="badge">${findings.length} findings</span>
</header>

<div class="grid">
  ${section(
    'Ports & Services',
    '🔌',
    ports.length > 0
      ? `<table><thead><tr><th>Port</th><th>Proto</th><th>Service</th><th>Version</th></tr></thead><tbody>${portRows}</tbody></table>`
      : '<p class="empty">No ports imported yet. Run htb.enum.importNmap.</p>',
  )}
  ${section(
    'Directories',
    '📂',
    dirs.length > 0
      ? `<table><thead><tr><th>Path</th><th>Status</th></tr></thead><tbody>${dirRows}</tbody></table>${dirs.length > 50 ? `<p class="empty">… and ${dirs.length - 50} more</p>` : ''}`
      : '',
  )}
  ${section('Subdomains / vHosts', '🌐', subs.length > 0 ? `<ul>${subRows}</ul>` : '')}
  ${section('Users / Credentials', '👤', users.length > 0 ? `<ul>${userRows}</ul>` : '')}
  ${section('CVE Candidates', '🐛', cves.length > 0 ? `<ul>${cveRows}</ul>` : '')}
  ${section('Notes', '📝', notes.length > 0 ? `<ul>${noteRows}</ul>` : '')}
</div>

${
  mitre.length > 0
    ? `<div class="mermaid-section">
  <h2>🛡 MITRE ATT&amp;CK Mapping</h2>
  <table>
    <thead><tr><th>Tactic ID</th><th>Tactic</th><th>Techniques</th><th>Evidence</th></tr></thead>
    <tbody>${mitreRows}</tbody>
  </table>
  <p style="color:var(--muted);font-size:11px;margin-top:6px;">Inferred from findings — verify manually before reporting.</p>
</div>`
    : ''
}

<div class="mermaid-section">
  <h2>📋 Mermaid Syntax <button onclick="copyMermaid()">Copy</button></h2>
  <pre id="mermaid-src">${mermaid.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  <p style="color:var(--muted);font-size:11px;margin-top:6px;">Paste into Mermaid Live Editor or Obsidian to render the graph.</p>
</div>

<script>
  function copyMermaid() {
    const text = document.getElementById('mermaid-src').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('button');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  }
</script>
</body>
</html>`;
}
