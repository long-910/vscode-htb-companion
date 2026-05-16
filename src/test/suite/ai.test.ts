import * as assert from 'assert';
import { buildContextPayload } from '../../services/ai.js';
import type { BoxContext } from '../../services/ai.js';
import type { EnumFinding } from '../../types/findings.js';
import type { HtbActiveMachine, HtbMachine } from '../../types/htb.js';

const MACHINE: HtbActiveMachine = {
  id: 123,
  name: 'TestBox',
  ip: '10.10.11.99',
  type: 'retired',
  lab_server: 'eu-free-1',
  expires_at: '2026-06-01T00:00:00Z',
};

const MACHINE_INFO: HtbMachine = {
  id: 123,
  name: 'TestBox',
  os: 'Linux',
  difficulty: 'Easy',
  difficultyText: 'Easy',
  points: 20,
  active: false,
  retired: true,
  authUserInUserOwns: false,
  authUserInRootOwns: false,
  release: '2025-01-01',
  avatar: '',
  star: 4.5,
};

function makeCtx(overrides: Partial<BoxContext> = {}): BoxContext {
  return {
    machine: MACHINE,
    machineInfo: MACHINE_INFO,
    findings: [],
    recentCommands: [],
    ...overrides,
  };
}

suite('buildContextPayload', () => {
  test('includes machine name and IP', () => {
    const payload = buildContextPayload(makeCtx());
    assert.ok(payload.includes('TestBox'));
    assert.ok(payload.includes('10.10.11.99'));
  });

  test('includes OS and difficulty from machineInfo', () => {
    const payload = buildContextPayload(makeCtx());
    assert.ok(payload.includes('Linux'));
    assert.ok(payload.includes('Easy'));
  });

  test('includes findings grouped by type', () => {
    const findings: EnumFinding[] = [
      {
        type: 'port',
        value: '22/tcp',
        source: 'nmap',
        confidence: 'high',
        timestamp: '',
        metadata: {},
      },
      {
        type: 'port',
        value: '80/tcp',
        source: 'nmap',
        confidence: 'high',
        timestamp: '',
        metadata: {},
      },
      {
        type: 'directory',
        value: '/admin',
        source: 'gobuster',
        confidence: 'high',
        timestamp: '',
        metadata: {},
      },
    ];
    const payload = buildContextPayload(makeCtx({ findings }));
    assert.ok(payload.includes('22/tcp'));
    assert.ok(payload.includes('80/tcp'));
    assert.ok(payload.includes('/admin'));
    assert.ok(payload.includes('port'));
    assert.ok(payload.includes('directory'));
  });

  test('masks HTB flags in findings', () => {
    const findings: EnumFinding[] = [
      {
        type: 'note',
        value: 'HTB{s3cr3t_fl4g_here}',
        source: 'manual',
        confidence: 'high',
        timestamp: '',
        metadata: {},
      },
    ];
    const payload = buildContextPayload(makeCtx({ findings }));
    assert.ok(!payload.includes('s3cr3t_fl4g_here'), 'flag should be masked');
    assert.ok(payload.includes('REDACTED'));
  });

  test('masks passwords in recent commands', () => {
    const recentCommands = [
      { timestamp: '', command: 'curl -u admin:SuperSecret123 http://target/', cwd: '' },
    ];
    const payload = buildContextPayload(makeCtx({ recentCommands }));
    assert.ok(!payload.includes('SuperSecret123'), 'password should be masked');
  });

  test('truncates payload exceeding 12000 chars', () => {
    const manyFindings: EnumFinding[] = Array.from({ length: 500 }, (_, i) => ({
      type: 'directory' as const,
      value: `/path/to/very/long/directory/number/${i}/with/extra/segments`,
      source: 'ffuf',
      confidence: 'high' as const,
      timestamp: '',
      metadata: {},
    }));
    const payload = buildContextPayload(makeCtx({ findings: manyFindings }));
    assert.ok(payload.length <= 12_200, 'payload should be truncated near 12000 chars');
    assert.ok(payload.includes('truncated'), 'truncation marker should be present');
  });

  test('handles null machine gracefully', () => {
    const payload = buildContextPayload(makeCtx({ machine: null, machineInfo: null }));
    assert.ok(!payload.includes('10.10.11.99'));
    assert.strictEqual(typeof payload, 'string');
  });

  test('returns empty string when no context at all', () => {
    const payload = buildContextPayload({
      machine: null,
      machineInfo: null,
      findings: [],
      recentCommands: [],
    });
    assert.strictEqual(payload, '');
  });
});
