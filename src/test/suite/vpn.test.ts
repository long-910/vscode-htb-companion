import * as assert from 'assert';
import { detectElevationStrategy } from '../../services/vpn.js';

suite('VPN elevation strategy', () => {
  test('detectElevationStrategy returns a valid strategy', () => {
    const strategy = detectElevationStrategy();
    const valid = ['none', 'sudo', 'pkexec', 'osascript', 'runas'];
    assert.ok(valid.includes(strategy), `Expected valid strategy, got: ${strategy}`);
  });

  test('strategy is platform-appropriate', () => {
    const strategy = detectElevationStrategy();
    const os = process.platform;
    if (os === 'win32') {
      assert.strictEqual(strategy, 'runas');
    } else if (os === 'darwin') {
      assert.strictEqual(strategy, 'osascript');
    } else {
      assert.ok(
        strategy === 'sudo' || strategy === 'none',
        `Linux strategy should be sudo or none, got: ${strategy}`,
      );
    }
  });
});
