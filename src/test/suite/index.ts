import * as path from 'path';
import Mocha from 'mocha';
import { readdirSync } from 'fs';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 60000 });
  const testsRoot = path.resolve(__dirname, '.');

  readdirSync(testsRoot)
    .filter((f) => f.endsWith('.test.js'))
    .forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed`));
      } else {
        resolve();
      }
    });
  });
}
