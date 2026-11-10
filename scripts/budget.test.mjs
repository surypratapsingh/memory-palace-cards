import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { judge, LIMITS, measure } from './budget.mjs';

/** Writes a fake dist/ folder: index.html with one module script and the given assets. */
function fakeDist(files, html) {
  const dir = mkdtempSync(join(tmpdir(), 'budget-'));
  mkdirSync(join(dir, 'assets'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  writeFileSync(join(dir, 'index.html'), html ?? '<script type="module" src="./assets/index.js"></script>');
  return dir;
}

test('measure reads the entry chunk and every asset from dist/', () => {
  const dir = fakeDist({ 'assets/index.js': 'x'.repeat(5000), 'assets/style.css': 'body{}' });
  try {
    const report = measure(dir);
    assert.equal(report.entry.name, 'assets/index.js');
    assert.equal(report.files.length, 3); // index.html, the entry and the stylesheet
    assert.ok(report.entry.gzip > 0 && report.entry.gzip < 5000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('judge passes a value exactly at each limit and fails one byte over', () => {
  const at = {
    entry: { name: 'a.js', bytes: 1, js: true, gzip: LIMITS.entryGzip, isEntry: true },
    files: [{ name: 'a.js', bytes: LIMITS.assetBytes, js: true, gzip: LIMITS.jsGzip, isEntry: true }],
  };
  assert.deepEqual(judge(at), []);
  const entryOver = structuredClone(at);
  entryOver.entry.gzip += 1;
  assert.equal(judge(entryOver).length, 1);
  const jsOver = structuredClone(at);
  jsOver.files[0].gzip += 1;
  assert.equal(judge(jsOver).length, 1);
  const big = structuredClone(at);
  big.files[0].bytes += 1;
  assert.equal(judge(big).length, 1);
});

test('measure fails clearly when dist/ is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'budget-'));
  try {
    assert.throws(() => measure(join(dir, 'dist')), /run npm run build first/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
