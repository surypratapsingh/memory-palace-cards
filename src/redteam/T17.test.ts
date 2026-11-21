import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { judge, LIMITS, table } from '../../scripts/budget.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

test('T17 red-team 1: budget.mjs LIMITS match packet specifications exactly', () => {
  const KB = 1024;
  assert.equal(LIMITS.entryGzip, 60 * KB, 'entryGzip limit must be exactly 60 kB');
  assert.equal(LIMITS.jsGzip, 200 * KB, 'jsGzip limit must be exactly 200 kB');
  assert.equal(LIMITS.assetBytes, 1024 * KB, 'assetBytes limit must be exactly 1024 kB (1 MB)');
});

test('T17 red-team 2: judge passes exact limit boundaries and catches single-byte overflows on all 3 metrics', () => {
  const entryPass = { name: 'assets/index.js', bytes: 100_000, js: true, gzip: LIMITS.entryGzip, isEntry: true };
  const baseFiles = [entryPass];
  const reportPass = { entry: entryPass, files: baseFiles };
  assert.deepEqual(judge(reportPass), [], 'report exactly at entry limit must have zero violations');

  // Entry gzip + 1
  const entryFail = { name: 'assets/index.js', bytes: 100_000, js: true, gzip: LIMITS.entryGzip + 1, isEntry: true };
  assert.equal(judge({ entry: entryFail, files: [entryFail] }).length, 1);
  assert.match(judge({ entry: entryFail, files: [entryFail] })[0], /entry.*gzip/);

  // Total jsGzip boundary
  const otherJsPass = { name: 'assets/palace.js', bytes: 500_000, js: true, gzip: LIMITS.jsGzip - LIMITS.entryGzip, isEntry: false };
  assert.deepEqual(judge({ entry: entryPass, files: [entryPass, otherJsPass] }), [], 'total js exactly at limit passes');

  const otherJsFail = { name: 'assets/palace.js', bytes: 500_000, js: true, gzip: LIMITS.jsGzip - LIMITS.entryGzip + 1, isEntry: false };
  const jsViolations = judge({ entry: entryPass, files: [entryPass, otherJsFail] });
  assert.equal(jsViolations.length, 1);
  assert.match(jsViolations[0], /all JS/);

  // Single assetBytes boundary
  const assetPass = { name: 'assets/texture.png', bytes: LIMITS.assetBytes, js: false, gzip: null, isEntry: false };
  assert.deepEqual(judge({ entry: entryPass, files: [entryPass, assetPass] }), [], 'asset exactly at 1 MB passes');

  const assetFail = { name: 'assets/texture.png', bytes: LIMITS.assetBytes + 1, js: false, gzip: null, isEntry: false };
  const assetViolations = judge({ entry: entryPass, files: [entryPass, assetFail] });
  assert.equal(assetViolations.length, 1);
  assert.match(assetViolations[0], /texture\.png.*limit/);
});

test('T17 red-team 3: non-JS assets do not contribute to jsGzip sum in judge or table', () => {
  const entry = { name: 'assets/index.js', bytes: 50_000, js: true, gzip: 20_000, isEntry: true };
  const css = { name: 'assets/style.css', bytes: 200_000, js: false, gzip: null, isEntry: false };
  const report = { entry, files: [entry, css] };

  const violations = judge(report);
  assert.deepEqual(violations, []);

  const renderedTable = table(report);
  assert.match(renderedTable, /assets\/style\.css\s+195\.3 kB\s+-/);
});

test('T17 red-team 4: code split in src/main.ts uses dynamic import, error boundary, and retry', () => {
  const mainSrc = readFileSync(resolve(ROOT, 'src/main.ts'), 'utf8');

  // Must not have static import of palaceView
  assert.equal(
    /^import\s+.*from\s+['"].*palaceView(?:\.ts)?['"]/m.test(mainSrc),
    false,
    'src/main.ts must not statically import palaceView',
  );

  // Must have dynamic import
  assert.match(
    mainSrc,
    /import\(['"].*scene\/palaceView\.ts['"]\)/,
    'src/main.ts must dynamically import scene/palaceView.ts',
  );

  // Error and retry handling
  assert.match(mainSrc, /Retry/, 'Loading error state must provide a Retry button');
  assert.match(mainSrc, /Opening the palace…/, 'Loading state must display "Opening the palace…"');
});

test('T17 red-team 5: loading state CSS conforms to accessibility and motion requirements', () => {
  const css = readFileSync(resolve(ROOT, 'src/style.css'), 'utf8');

  // Keyframes animation cycle >= 1s
  assert.match(css, /palace-spin\s+1\.5s/, 'palace spinner cycle must be at least 1s (found 1.5s)');

  // Prefers-reduced-motion turns animation off
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.palace-state[^{]*\{\s*animation:\s*none;\s*\}/,
    'reduced motion must disable spinner animation',
  );
});

test('T17 red-team 6: production hygiene - no DEV hooks leaked in src/ and CI has budget step', () => {
  const palaceSrc = readFileSync(resolve(ROOT, 'src/scene/palaceView.ts'), 'utf8');
  assert.equal(
    /__THREE_DEVTOOLS__/.test(palaceSrc),
    false,
    'src/scene/palaceView.ts must not contain __THREE_DEVTOOLS__',
  );

  const ciYaml = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ciYaml, /npm run budget/, 'ci.yml must run npm run budget');
});
