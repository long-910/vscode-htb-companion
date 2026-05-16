import * as assert from 'assert';
import { parseNmapText, parseNmapXml } from '../../services/parsers/nmap.js';
import { parseGobusterOutput } from '../../services/parsers/gobuster.js';
import { parseFfufJson, parseFfufText } from '../../services/parsers/ffuf.js';

// ─── nmap ─────────────────────────────────────────────────────────────────────

suite('parseNmapText', () => {
  const NMAP_BASIC = `
Starting Nmap 7.94
Nmap scan report for 10.10.11.1
22/tcp   open  ssh     OpenSSH 8.2
80/tcp   open  http    nginx 1.18.0
443/tcp  open  https   nginx 1.18.0
8080/tcp closed http
`.trim();

  test('parses open ports', () => {
    const findings = parseNmapText(NMAP_BASIC);
    const ports = findings.filter((f) => f.type === 'port');
    assert.strictEqual(ports.length, 3);
    assert.ok(ports.some((f) => f.value === '22/tcp'));
    assert.ok(ports.some((f) => f.value === '80/tcp'));
    assert.ok(ports.some((f) => f.value === '443/tcp'));
  });

  test('excludes closed/filtered ports', () => {
    const findings = parseNmapText(NMAP_BASIC);
    assert.ok(!findings.some((f) => f.value === '8080/tcp'));
  });

  test('sets source and confidence', () => {
    const findings = parseNmapText(NMAP_BASIC);
    const port = findings.find((f) => f.value === '22/tcp')!;
    assert.strictEqual(port.source, 'nmap');
    assert.strictEqual(port.confidence, 'high');
  });

  test('extracts service and version metadata', () => {
    const findings = parseNmapText(NMAP_BASIC);
    const ssh = findings.find((f) => f.value === '22/tcp')!;
    assert.strictEqual(ssh.metadata?.['service'], 'ssh');
    assert.ok((ssh.metadata?.['version'] as string).includes('OpenSSH'));
  });

  test('extracts OS detection note', () => {
    const output = '22/tcp open ssh\nOS details: Linux 4.15 - 5.6\n';
    const findings = parseNmapText(output);
    const note = findings.find(
      (f) => f.type === 'note' && (f.metadata?.['kind'] as string) === 'os-detection',
    );
    assert.ok(note, 'OS note should be present');
    assert.ok(note!.value.includes('Linux'));
  });

  test('extracts HTTP title note', () => {
    const output = '80/tcp open http\n|_http-title: Admin Panel\n';
    const findings = parseNmapText(output);
    const note = findings.find(
      (f) => f.type === 'note' && (f.metadata?.['kind'] as string) === 'http-title',
    );
    assert.ok(note, 'HTTP title note should be present');
    assert.ok(note!.value.includes('Admin Panel'));
  });

  test('ignores boring HTTP title', () => {
    const output = "80/tcp open http\n|_http-title: Site doesn't have a title\n";
    const findings = parseNmapText(output);
    assert.ok(
      !findings.some((f) => f.type === 'note' && (f.metadata?.['kind'] as string) === 'http-title'),
    );
  });

  test('returns empty array for non-nmap input', () => {
    const findings = parseNmapText('hello world');
    assert.strictEqual(findings.length, 0);
  });
});

suite('parseNmapXml', () => {
  const XML = `<?xml version="1.0"?>
<nmaprun>
  <host>
    <ports>
      <port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh" product="OpenSSH" version="8.2"/></port>
      <port protocol="tcp" portid="80"><state state="open" reason="syn-ack"/><service name="http"/></port>
      <port protocol="tcp" portid="443"><state state="closed" reason="reset"/></port>
    </ports>
  </host>
</nmaprun>`;

  test('parses open ports from XML', () => {
    const findings = parseNmapXml(XML);
    assert.strictEqual(findings.length, 2);
    assert.ok(findings.some((f) => f.value === '22/tcp'));
    assert.ok(findings.some((f) => f.value === '80/tcp'));
  });

  test('excludes closed ports from XML', () => {
    const findings = parseNmapXml(XML);
    assert.ok(!findings.some((f) => f.value === '443/tcp'));
  });

  test('returns empty for non-XML input', () => {
    const findings = parseNmapXml('not xml');
    assert.strictEqual(findings.length, 0);
  });
});

// ─── gobuster ─────────────────────────────────────────────────────────────────

suite('parseGobusterOutput', () => {
  const DIR_OUTPUT = `
===============================================================
Gobuster v3.6
===============================================================
/admin                (Status: 200) [Size: 1234]
/login                (Status: 301) [Size: 0]
/secret               (Status: 403) [Size: 512]
/notfound             (Status: 404) [Size: 0]
===============================================================
`.trim();

  test('parses dir mode results', () => {
    const findings = parseGobusterOutput(DIR_OUTPUT);
    assert.ok(findings.some((f) => f.value === '/admin'));
    assert.ok(findings.some((f) => f.value === '/login'));
    assert.ok(findings.some((f) => f.value === '/secret'));
  });

  test('filters 404 results in dir mode', () => {
    const findings = parseGobusterOutput(DIR_OUTPUT);
    assert.ok(!findings.some((f) => f.value === '/notfound'));
  });

  test('sets type to directory for dir mode', () => {
    const findings = parseGobusterOutput(DIR_OUTPUT);
    assert.ok(findings.every((f) => f.type === 'directory'));
  });

  test('stores status in metadata', () => {
    const findings = parseGobusterOutput(DIR_OUTPUT);
    const admin = findings.find((f) => f.value === '/admin')!;
    assert.strictEqual(admin.metadata?.['status'], 200);
  });

  const DNS_OUTPUT = `
===============================================================
Found: api.example.htb
Found: mail.example.htb
Found: dev.example.htb
===============================================================
`.trim();

  test('parses dns mode results', () => {
    const findings = parseGobusterOutput(DNS_OUTPUT);
    assert.ok(findings.some((f) => f.value === 'api.example.htb'));
    assert.ok(findings.some((f) => f.value === 'mail.example.htb'));
  });

  test('sets type to subdomain for dns mode', () => {
    const findings = parseGobusterOutput(DNS_OUTPUT);
    assert.ok(findings.every((f) => f.type === 'subdomain'));
  });

  const VHOST_OUTPUT = `
Found: admin.example.htb (Status: 200) [Size: 3456]
Found: dev.example.htb (Status: 302) [Size: 0]
`.trim();

  test('parses vhost mode results', () => {
    const findings = parseGobusterOutput(VHOST_OUTPUT);
    assert.ok(findings.some((f) => f.value === 'admin.example.htb'));
    assert.ok(findings.some((f) => f.value === 'dev.example.htb'));
  });

  test('sets type to subdomain for vhost mode', () => {
    const findings = parseGobusterOutput(VHOST_OUTPUT);
    assert.ok(findings.every((f) => f.type === 'subdomain'));
  });

  test('returns empty for unrecognized input', () => {
    const findings = parseGobusterOutput('random output here');
    assert.strictEqual(findings.length, 0);
  });
});

// ─── ffuf ─────────────────────────────────────────────────────────────────────

suite('parseFfufJson', () => {
  const JSON_INPUT = JSON.stringify({
    commandline: 'ffuf -u http://10.10.11.1/FUZZ -w wordlist.txt -of json',
    results: [
      {
        input: { FUZZ: 'admin' },
        status: 200,
        length: 1234,
        words: 100,
        lines: 40,
        url: 'http://10.10.11.1/admin',
        content_type: 'text/html',
        redirectlocation: '',
      },
      {
        input: { FUZZ: 'login' },
        status: 301,
        length: 0,
        words: 0,
        lines: 0,
        url: 'http://10.10.11.1/login',
        redirectlocation: 'http://10.10.11.1/login/',
      },
      {
        input: { FUZZ: 'notfound' },
        status: 404,
        length: 0,
        words: 0,
        lines: 0,
        url: 'http://10.10.11.1/notfound',
      },
    ],
  });

  test('parses directory results from JSON', () => {
    const findings = parseFfufJson(JSON_INPUT);
    assert.ok(findings.some((f) => f.value === 'http://10.10.11.1/admin'));
    assert.ok(findings.some((f) => f.value === 'http://10.10.11.1/login'));
  });

  test('filters 404 results', () => {
    const findings = parseFfufJson(JSON_INPUT);
    assert.ok(!findings.some((f) => f.value.includes('notfound')));
  });

  test('sets type to directory for path FUZZ values', () => {
    const findings = parseFfufJson(JSON_INPUT);
    assert.ok(findings.every((f) => f.type === 'directory'));
  });

  test('stores status in metadata', () => {
    const findings = parseFfufJson(JSON_INPUT);
    const admin = findings.find((f) => f.value.includes('admin'))!;
    assert.strictEqual(admin.metadata?.['status'], 200);
  });

  test('detects vhost FUZZ pattern as subdomain', () => {
    const vhostJson = JSON.stringify({
      results: [
        {
          input: { FUZZ: 'dev' },
          status: 200,
          length: 1000,
          words: 50,
          lines: 30,
          url: 'http://10.10.11.1',
        },
      ],
    });
    const findings = parseFfufJson(vhostJson);
    assert.strictEqual(findings[0].type, 'subdomain');
    assert.strictEqual(findings[0].value, 'dev');
  });

  test('returns empty array for invalid JSON', () => {
    const findings = parseFfufJson('not json');
    assert.strictEqual(findings.length, 0);
  });

  test('returns empty array for JSON without results', () => {
    const findings = parseFfufJson('{}');
    assert.strictEqual(findings.length, 0);
  });
});

suite('parseFfufText', () => {
  const TEXT_OUTPUT = `
admin                   [Status: 200, Size: 1234, Words: 100, Lines: 40, Duration: 5ms]
login                   [Status: 301, Size: 0, Words: 0, Lines: 0, Duration: 2ms]
notfound                [Status: 404, Size: 0, Words: 0, Lines: 0, Duration: 1ms]
`.trim();

  test('parses text output results', () => {
    const findings = parseFfufText(TEXT_OUTPUT);
    assert.ok(findings.some((f) => f.value === 'admin'));
    assert.ok(findings.some((f) => f.value === 'login'));
  });

  test('filters 404 results from text', () => {
    const findings = parseFfufText(TEXT_OUTPUT);
    assert.ok(!findings.some((f) => f.value === 'notfound'));
  });

  test('sets confidence to medium for text output', () => {
    const findings = parseFfufText(TEXT_OUTPUT);
    assert.ok(findings.every((f) => f.confidence === 'medium'));
  });

  test('returns empty for unrecognized text', () => {
    const findings = parseFfufText('hello world\nno matches here');
    assert.strictEqual(findings.length, 0);
  });
});
