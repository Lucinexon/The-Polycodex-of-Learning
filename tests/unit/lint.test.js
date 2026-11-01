'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..', '..');
function run(script, args) {
  return spawnSync(process.execPath, [path.join(root, script)].concat(args || []), { cwd: root, encoding: 'utf8' });
}

test('the live Ratios unit passes unit lint with no warnings', () => {
  const r = run('scripts/lint-units.js');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /number-shallows-ratios/);
  assert.match(r.stdout, /0 warning/);
});

test('the broken fixture fails lint with schema errors', () => {
  const r = run('scripts/lint-units.js', ['--file', 'tests/fixtures/units/broken-unit.js']);
  assert.equal(r.status, 1);
  const out = r.stdout + r.stderr;
  assert.match(out, /objectives must be 2/);
  assert.match(out, /dives required/);
  assert.match(out, /objectiveCoverage is required/);
});

test('the generated manifest is current', () => {
  const r = run('scripts/build-manifest.js', ['--check']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /manifest check passed/);
});

test('the generated boot bundle is current', () => {
  const r = run('scripts/build-boot-base.js', ['--check']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /boot-base\.js is current/);
});

test('the content inventory hashes and order still match', () => {
  const r = run('scripts/content-inventory.js', ['--check']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /content-inventory OK: 42 lessons/);
});
