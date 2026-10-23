import assert from 'node:assert/strict';
import test from 'node:test';

test('red-team: daily replay keeps the daily flag and date seed', async () => {
  const { drillSeed } = await import('../drill-logic.ts');
  const date = new Date(2026, 9, 21, 23, 59, 59);
  const seed = drillSeed(true, date);
  assert.equal(seed, '2026-10-21');
  assert.equal(seed, drillSeed(true, new Date(2026, 9, 21, 0, 0, 1)));
});

test('red-team: daily replay preserves mode in drill implementation', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../ui/drill.ts', import.meta.url), 'utf8');
  assert.match(source, /startRound\(currentLevel, isDaily\)/);
  assert.match(source, /daily \? localDay\(startDate\) : drillSeed\(false, startDate\)/);
});

test('red-team: confirm dismissal removes the keyboard handler', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../ui/drill.ts', import.meta.url), 'utf8');
  assert.match(source, /window\.removeEventListener\('keydown', onKey\)/);
  assert.match(source, /cancelBtn\.addEventListener\('click', closeConfirm\)/);
  assert.match(source, /if \(closed\) return;/);
});

test('red-team: active camera glides use a generation token invalidated on cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../ui/drill.ts', import.meta.url), 'utf8');
  assert.match(source, /currentGlideToken\+\+/);
  assert.match(source, /token !== currentGlideToken/);
  assert.match(source, /currentGlideToken\+\+;\s*if \(activeQuitCleanup\)/);
});

test('red-team: dynamic UI text is not assigned with innerHTML', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../ui/drill.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('innerHTML'), false);
});
