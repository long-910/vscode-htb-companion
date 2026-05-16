import * as assert from 'assert';

suite('Extension Test Suite', () => {
  test('Scaffold sanity check', () => {
    assert.strictEqual(1 + 1, 2);
  });

  test('maskSensitive redacts HTB flags', async () => {
    const { maskSensitive } = await import('../../utils/mask.js');
    const input = 'Found flag: HTB{s0m3_t3st_fl4g}';
    const result = maskSensitive(input);
    assert.ok(!result.includes('s0m3_t3st_fl4g'), 'Flag should be redacted');
    assert.ok(result.includes('REDACTED'), 'Should contain REDACTED marker');
  });
});
