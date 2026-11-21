// T17 red-team: adversarial checks on scripts/budget.mjs. Fails here = finding.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { judge, LIMITS, main, measure } from './budget.mjs';

function dist(html, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'budget-rt-'));
  mkdirSync(join(dir, 'assets'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  writeFileSync(join(dir, 'index.html'), html);
  return dir;
}

function withDist(dir, fn) {
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('red-team 1: missing dist/ makes main return 1 and never throws', () => {
  const dir = mkdtempSync(join(tmpdir(), 'budget-rt-'));
  try {
    assert.equal(main(join(dir, 'nope')), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('red-team 2: two module scripts in index.html are refused, not averaged', () => {
  withDist(
    dist(
      '<script type="module" src="./assets/a.js"></script><script type="module" src="./assets/b.js"></script>',
      { 'assets/a.js': 'a', 'assets/b.js': 'b' },
    ),
    (dir) => assert.throws(() => measure(dir), /expected 1 module script in index.html, found 2/),
  );
});

test('red-team 3: a non-module script does not count as the entry', () => {
  withDist(
    dist('<script src="./assets/legacy.js"></script><script type="module" src="./assets/index.js"></script>', {
      'assets/index.js': 'x',
      'assets/legacy.js': 'y',
    }),
    (dir) => assert.equal(measure(dir).entry.name, 'assets/index.js'),
  );
});

test('red-team 4: a non-JS asset over 1 MB fails the asset rule', () => {
  withDist(
    dist('<script type="module" src="./assets/index.js"></script>', {
      'assets/index.js': 'x',
      'assets/model.bin': Buffer.alloc(LIMITS.assetBytes + 1, 0),
    }),
    (dir) => {
      const violations = judge(measure(dir));
      assert.equal(violations.length, 1);
      assert.match(violations[0], /model\.bin/);
    },
  );
});

test('red-team 5: the entry script is missing from dist/', () => {
  withDist(dist('<script type="module" src="./assets/gone.js"></script>'), (dir) => {
    assert.throws(() => measure(dir), /entry \.\/assets\/gone\.js is not in dist\//);
  });
});

test('red-team 6: a module script with an absolute src still resolves inside dist/', () => {
  withDist(dist('<script type="module" src="/assets/index.js"></script>', { 'assets/index.js': 'x' }), (dir) => {
    assert.equal(measure(dir).entry.name, 'assets/index.js');
  });
});
