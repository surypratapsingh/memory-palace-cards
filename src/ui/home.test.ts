import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyDrillOn, mountHome } from './home.ts';
import { emptySave } from '../store.ts';
import type { DrillResult, SaveData } from '../types.ts';

function makeDrill(seed: string, at: string, daily = true): DrillResult {
  return {
    at,
    seed,
    daily,
    sequence: ['AS', '2S', '3S'],
    answers: ['AS', '2S', '3S'],
    memorizeMs: 5000,
    recallMs: 4000,
  };
}

// Minimal DOM for mountHome testing
class MockEl {
  className = '';
  textContent = '';
  type = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: MockEl[] = [];
  parentElement: MockEl | null = null;
  private on = new Map<string, Set<EventListener>>();

  setAttribute(k: string, v: string) {
    this.attributes.set(k, String(v));
  }
  getAttribute(k: string): string | null {
    return this.attributes.get(k) ?? null;
  }
  appendChild(c: MockEl) {
    c.parentElement = this;
    this.children.push(c);
    return c;
  }
  removeChild(c: MockEl) {
    const idx = this.children.indexOf(c);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      c.parentElement = null;
    }
    return c;
  }
  addEventListener(type: string, fn: EventListener) {
    if (!this.on.has(type)) this.on.set(type, new Set());
    this.on.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: EventListener) {
    this.on.get(type)?.delete(fn);
  }
  click() {
    for (const f of [...(this.on.get('click') ?? [])]) {
      f({ type: 'click' } as unknown as Event);
    }
  }
  find(predicate: (el: MockEl) => boolean): MockEl | undefined {
    if (predicate(this)) return this;
    for (const c of this.children) {
      const match = c.find(predicate);
      if (match) return match;
    }
    return undefined;
  }
  findAll(predicate: (el: MockEl) => boolean): MockEl[] {
    const res: MockEl[] = [];
    if (predicate(this)) res.push(this);
    for (const c of this.children) {
      res.push(...c.findAll(predicate));
    }
    return res;
  }
}

function setupDom() {
  const g = globalThis as Record<string, unknown>;
  const prevDoc = g.document;
  const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  g.document = {
    createElement: () => new MockEl(),
    createElementNS: () => new MockEl(),
    documentElement: { classList: { contains: () => false } },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async () => {} } },
  });

  return () => {
    g.document = prevDoc;
    if (navDesc) {
      Object.defineProperty(globalThis, 'navigator', navDesc);
    }
  };
}

test('dailyDrillOn: matches the local-day seed, not the UTC date of `at`', () => {
  // Daily played late on local Nov 8 in UTC-8 is stamped Nov 9 in UTC; it must not count as Nov 9's daily.
  const yesterdayDaily = makeDrill('2026-11-08', '2026-11-09T04:00:00.000Z', true);

  assert.equal(
    dailyDrillOn([yesterdayDaily], '2026-11-09'),
    undefined,
    'Daily with yesterday seed must not count as done today even if at is stamped with today UTC',
  );
  assert.equal(
    dailyDrillOn([yesterdayDaily], '2026-11-08'),
    yesterdayDaily,
    'Daily with yesterday seed must count as done on yesterday',
  );

  const todayDaily = makeDrill('2026-11-09', '2026-11-09T10:00:00.000Z', true);
  assert.equal(
    dailyDrillOn([yesterdayDaily, todayDaily], '2026-11-09'),
    todayDaily,
    'Today daily matches when seed is today',
  );

  const nonDaily = makeDrill('2026-11-09', '2026-11-09T10:00:00.000Z', false);
  assert.equal(
    dailyDrillOn([nonDaily], '2026-11-09'),
    undefined,
    'Non-daily drill with today seed must not count as daily done today',
  );
});

test('mountHome: daily deck button displays "Daily Deck" when yesterday daily has today UTC timestamp', () => {
  const cleanup = setupDom();
  try {
    const root = new MockEl();
    const data: SaveData = emptySave();
    // Add a drill so it is not a first-run view
    const yesterdayDaily = makeDrill('2026-11-08', `${new Date().toISOString().slice(0, 10)}T23:59:00.000Z`, true);
    data.drills = [yesterdayDaily];

    const actions = {
      train() {},
      drill(_level: number, _daily: boolean) {},
      settings() {},
      replaceSave() {},
    };

    mountHome(root as unknown as HTMLElement, data, actions);

    const buttons = root.findAll((el) => el.type === 'button');
    const dailyBtn = buttons.find((b) => b.textContent === 'Daily Deck' || b.textContent === 'Replay Daily Deck');
    assert.ok(dailyBtn, 'Daily button should exist');
    assert.equal(
      dailyBtn.textContent,
      'Daily Deck',
      'Should show "Daily Deck" when daily was not done today (seed !== today)',
    );

    const shareBox = root.find((el) => el.className === 'share-preview-box');
    assert.equal(shareBox, undefined, 'Share preview box should not appear when daily is not done today');
  } finally {
    cleanup();
  }
});
