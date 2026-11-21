import assert from 'node:assert/strict';
import test from 'node:test';
import { copyWithFeedback } from './copyButton.ts';

const button = () => ({ textContent: 'Copy Result' });
const tick = () => new Promise((r) => setTimeout(r, 5));
const RESET = 40;
const afterReset = () => new Promise((r) => setTimeout(r, RESET + 40));

test('a successful copy says Copied! then restores the label', async () => {
  const b = button();
  const wrote: string[] = [];
  copyWithFeedback(b, 'text', { writeText: async (t: string) => void wrote.push(t) }, RESET);
  await tick();
  assert.deepEqual(wrote, ['text']);
  assert.equal(b.textContent, 'Copied!');
  await afterReset();
  assert.equal(b.textContent, 'Copy Result');
});

test('a refused clipboard write is not an unhandled rejection and says Copy failed', async () => {
  const unhandled: unknown[] = [];
  const onRejection = (e: unknown) => unhandled.push(e);
  process.on('unhandledRejection', onRejection);
  try {
    const b = button();
    copyWithFeedback(b, 'text', { writeText: () => Promise.reject(new Error('denied')) }, RESET);
    await tick();
    assert.equal(b.textContent, 'Copy failed');
    await afterReset();
    assert.equal(b.textContent, 'Copy Result');
    assert.equal(unhandled.length, 0);
  } finally { process.off('unhandledRejection', onRejection); }
});

test('no clipboard at all says Copy failed', async () => {
  const b = button();
  copyWithFeedback(b, 'text', undefined, RESET);
  assert.equal(b.textContent, 'Copy failed');
});
