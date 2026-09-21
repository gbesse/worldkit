// Purpose: Exercise the installed-style CLI workflow, invalid commands and non-overwriting output files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const bin = join(root, 'bin/worldkit.mjs');
const env = { ...process.env, MANDATE_SIGNING_KEY: 'fictional-cli-test-secret-at-least-32-bytes' };
delete env.TYPESAFE_API_KEY;
function run(...args) { return execFileSync(process.execPath, [bin, ...args], { cwd: root, env, timeout: 10_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function fixtures(t) {
  const dir = mkdtempSync(join(tmpdir(), 'worldkit-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync(process.execPath, [join(root, 'examples/write-fixtures.mjs'), dir], { env, timeout: 10_000, stdio: 'pipe' });
  return name => join(dir, name);
}
const read = path => JSON.parse(readFileSync(path, 'utf8'));
test('help works and unknown commands fail visibly', () => {
  assert.match(run('--help'), /worldkit/);
  assert.throws(() => run('unknown'), error => error.status === 1 && error.stderr.includes('Invalid'));
});
test('CLI replays both an initial run and a continuation without duplicating earlier history', t => {
  const f = fixtures(t);
  run('simulate', f('world.json'), f('behaviors.json'), '9', f('run.json'));
  assert.deepEqual(JSON.parse(run('replay', f('world.json'), f('run.json'))), read(f('run.json')).world);
  writeFileSync(f('continued-world.json'), JSON.stringify(read(f('run.json')).world));
  run('simulate', f('continued-world.json'), f('behaviors.json'), '3', f('continued-run.json'));
  assert.deepEqual(JSON.parse(run('replay', f('continued-world.json'), f('continued-run.json'))), read(f('continued-run.json')).world);
  assert.throws(() => run('simulate', f('world.json'), f('behaviors.json'), '9', f('run.json')), error => error.stderr.includes('EEXIST'));
  assert.equal(read(f('run.json')).world.tick, 9);
});
