import * as assert from 'assert';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceService } from '../../services/workspace.js';
import type { Logger } from '../../utils/logger.js';
import type { HtbMachine } from '../../types/htb.js';

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  show: () => {},
  dispose: () => {},
};

const fakeMachine: HtbMachine = {
  id: 123,
  name: 'TestBox',
  os: 'Linux',
  difficulty: 'Easy',
  difficultyText: '3.5/10',
  points: 20,
  active: true,
  retired: false,
  authUserInUserOwns: false,
  authUserInRootOwns: false,
  release: '2024-01-01',
  avatar: '',
  star: 4.5,
};

suite('WorkspaceService', function () {
  let tmpRoot: string;

  setup(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'htb-ws-test-'));
  });

  teardown(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  test('scaffoldBoxWorkspace creates expected directories', async () => {
    const svc = new WorkspaceService('', noopLogger);
    const overrideRoot = tmpRoot;

    const boxDir = join(overrideRoot, fakeMachine.name);
    // Call the private logic by using the public API with a known root
    // We monkey-patch getWorkspaceRoot for this test
    const configModule = await import('../../utils/config.js');
    const originalFn = configModule.getWorkspaceRoot;
    Object.defineProperty(configModule, 'getWorkspaceRoot', {
      value: () => overrideRoot,
      configurable: true,
    });

    try {
      const result = await svc.scaffoldBoxWorkspace(fakeMachine, '10.10.11.1');
      assert.strictEqual(result, boxDir);

      // Verify key directories exist
      for (const dir of ['.htb', '.vscode', 'scans/nmap', 'scans/web', 'loot']) {
        await assert.doesNotReject(
          () => access(join(boxDir, dir)),
          `Expected directory ${dir} to exist`,
        );
      }

      // Verify box.json contains correct metadata
      const metaRaw = await readFile(join(boxDir, '.htb', 'box.json'), 'utf-8');
      const meta = JSON.parse(metaRaw) as Record<string, unknown>;
      assert.strictEqual(meta['name'], 'TestBox');
      assert.strictEqual(meta['os'], 'Linux');
      assert.strictEqual(meta['ip'], '10.10.11.1');

      // Verify notes.md was created
      await assert.doesNotReject(() => access(join(boxDir, 'notes.md')));
    } finally {
      Object.defineProperty(configModule, 'getWorkspaceRoot', {
        value: originalFn,
        configurable: true,
      });
    }
  });

  test('scaffoldBoxWorkspace does not overwrite existing notes.md', async () => {
    const svc = new WorkspaceService('', noopLogger);
    const configModule = await import('../../utils/config.js');
    const originalFn = configModule.getWorkspaceRoot;
    Object.defineProperty(configModule, 'getWorkspaceRoot', {
      value: () => tmpRoot,
      configurable: true,
    });

    try {
      await svc.scaffoldBoxWorkspace(fakeMachine, '10.10.11.1');
      const firstContent = await readFile(join(tmpRoot, fakeMachine.name, 'notes.md'), 'utf-8');

      // Second scaffold should not overwrite
      await svc.scaffoldBoxWorkspace(fakeMachine, '10.10.11.2');
      const secondContent = await readFile(join(tmpRoot, fakeMachine.name, 'notes.md'), 'utf-8');

      assert.strictEqual(firstContent, secondContent, 'notes.md should not be overwritten');
    } finally {
      Object.defineProperty(configModule, 'getWorkspaceRoot', {
        value: originalFn,
        configurable: true,
      });
    }
  });
});
