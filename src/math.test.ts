import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK, deal, isCardId, localDay, rng, score, shuffle } from './deck.ts';
import { Rating, isDue, newSrs, recall, review, strength } from './srs.ts';
import { emptySave, importJson, load, save, setSaveErrorHandler } from './store.ts';
import { readFileSync } from 'node:fs';
import { default_w } from 'ts-fsrs';

const fakeStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as const;
};

/* ── §1 Uniformity (chi-square) ────────────────────────────────────────────── */

function chiSquare(counts: readonly number[], expected: number): number {
  let sum = 0;
  for (const c of counts) {
    const d = c - expected;
    sum += (d * d) / expected;
  }
  return sum;
}

function cardCounts(cards: readonly string[]): number[] {
  const indices = new Map(DECK.map((card, index) => [card, index]));
  const counts = new Array(DECK.length).fill(0);
  for (const card of cards) counts[indices.get(card)!]++;
  return counts;
}

function dailySeed(i: number): string {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// §1 three distributions from the MATHS.md table, all across 52 card bins
test('§1 first card distribution matches the 52-bin chi-square bound', () => {
  const cards = Array.from({ length: 10400 }, (_, i) => deal(1, 's' + i)[0]);
  assert.ok(chiSquare(cardCounts(cards), 200) <= 87.97);
});

test('§1 AS position distribution matches the 52-bin chi-square bound', () => {
  const counts = new Array(52).fill(0);
  for (let i = 0; i < 10400; i++) counts[deal(52, 'p' + i).indexOf('AS')]++;
  assert.ok(chiSquare(counts, 200) <= 87.97);
});

test('§1 daily-deck first card distribution matches the 52-bin chi-square bound', () => {
  const cards = Array.from({ length: 1092 }, (_, i) => deal(1, dailySeed(i))[0]);
  assert.ok(chiSquare(cardCounts(cards), 21) <= 87.97);
});

// §1 neighbour independence: same-suit rate within ±0.015 of 12/51
test('§1 neighbour independence: same-suit rate within ±0.015 of 12/51', () => {
  let sameSuit = 0;
  let total = 0;
  for (let i = 0; i < 20000; i++) {
    const dealt = deal(52, 'x' + i);
    for (let j = 1; j < dealt.length; j++) {
      const prevSuit = dealt[j - 1][1] as 'S' | 'H' | 'D' | 'C';
      const currSuit = dealt[j][1] as 'S' | 'H' | 'D' | 'C';
      if (prevSuit === currSuit) sameSuit++;
      total++;
    }
  }
  const rate = sameSuit / total;
  const expected = 12 / 51; // ~0.2353
  assert.ok(Math.abs(rate - expected) < 0.015, `same-suit rate ${rate.toFixed(4)} outside ±0.015 of ${expected}`);
});

// §1 deal(n, seed) equals deal(52, seed).slice(0, n)
test('§1 deal(n, seed) equals deal(52, seed).slice(0, n)', () => {
  for (let n = 1; n <= 52; n++) {
    for (let s = 0; s < 10; s++) {
      const dealt52 = deal(52, 'seed' + s);
      const dealtN = deal(n, 'seed' + s);
      assert.deepEqual(dealtN, dealt52.slice(0, n));
    }
  }
});

// §1 deal(52, seed) is a permutation of DECK
test('§1 deal(52, seed) is a permutation of DECK', () => {
  for (let s = 0; s < 10; s++) {
    const dealt = deal(52, 'seed' + s);
    assert.equal(new Set(dealt).size, 52);
    for (const card of DECK) {
      assert.ok(dealt.includes(card), `card ${card} not in deal`);
    }
  }
});

// §1 shuffle does not mutate input and permits fixed points (unlike Sattolo's algorithm)
test('§1 shuffle copies its input and permits the identity permutation', () => {
  const items = ['a', 'b', 'c', 'd'];
  const shuffled = shuffle(items, () => 0.999999);
  assert.deepEqual(items, ['a', 'b', 'c', 'd']);
  assert.deepEqual(shuffled, items);
  assert.notStrictEqual(shuffled, items);
});

/* ── §2 Score correctness ──────────────────────────────────────────────────── */

test('§2 score() on 1000 seeded sequence/answer pairs satisfies the invariants', () => {
  const random = rng('M1-score-invariants');
  for (let i = 0; i < 1000; i++) {
    const sequence = deal(52, 'score' + i);
    const answers = sequence.map((card) => {
      const choice = random();
      return choice < 0.5 ? card : choice < 0.75 ? null : 'AS';
    });
    const result = score(sequence, answers);
    const expectedCorrect = answers.reduce((count, answer, index) => count + Number(answer === sequence[index]), 0);
    const mismatch = answers.findIndex((answer, index) => answer !== sequence[index]);
    assert.equal(result.total, sequence.length);
    assert.equal(result.correct, expectedCorrect);
    assert.equal(result.run, mismatch < 0 ? sequence.length : mismatch);
    assert.ok(0 <= result.run && result.run <= result.correct && result.correct <= result.total);
  }
});

/* ── §3 Bracket invariant ──────────────────────────────────────────────────── */

test('§3 bracket invariant: recall(s, last + ⌊S⌋ days) ≥ 0.9 ≥ recall(s, last + ⌈S⌉ days)', () => {
  // Use valid ratings: Manual(0), Again(1), Hard(2), Good(3), Easy(4)
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  for (const grade of ratings) {
    const t0 = new Date('2026-01-01T10:00:00Z');
    const s0 = newSrs(t0);
    let s = review(s0, grade, t0);
    const S = s.stability;
    const floorS = Math.floor(S);
    const ceilS = Math.ceil(S);
    const t1 = new Date(t0);
    t1.setDate(t1.getDate() + floorS);
    const r1 = recall(s, t1);
    assert.ok(r1 >= 0.9, `recall at floor(S) = ${r1.toFixed(4)} < 0.9 for grade ${grade}`);
    const t2 = new Date(t0);
    t2.setDate(t2.getDate() + ceilS);
    const r2 = recall(s, t2);
    assert.ok(r2 <= 0.9, `recall at ceil(S) = ${r2.toFixed(4)} > 0.9 for grade ${grade}`);
  }
});

/* ── §3 recall monotone ────────────────────────────────────────────────────── */

test('§3 recall never increases while time passes without a review', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const s0 = newSrs(t0);
  let s = review(s0, Rating.Good, t0);
  const days = [10, 50, 100, 200, 300, 400];
  const recalls = days.map(d => {
    const t = new Date(t0);
    t.setDate(t.getDate() + d);
    return recall(s, t);
  });
  for (let i = 1; i < recalls.length; i++) {
    assert.ok(recalls[i] <= recalls[i - 1],
      `recall decreased from ${recalls[i - 1].toFixed(4)} to ${recalls[i].toFixed(4)}`);
  }
});

/* ── §3 range [0, 1] and State.New = 0 ─────────────────────────────────────── */

test('§3 range: 0 ≤ recall ≤ 1; recall = 0 for State.New', () => {
  const sNew = newSrs(new Date());
  assert.equal(recall(sNew), 0, 'never-reviewed card should have recall 0');
  const t0 = new Date('2026-01-01T10:00:00Z');
  const s0 = newSrs(t0);
  let s = review(s0, Rating.Good, t0);
  const r = recall(s, t0);
  assert.ok(r >= 0 && r <= 1, `recall ${r} outside [0, 1]`);
});

/* ── §3 JSON round trip preserves recall ─────────────────────────────────────── */

test('§3 recall after JSON round trip equals recall on original within 1e-12', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const s0 = newSrs(t0);
  let s = review(s0, Rating.Good, t0);
  const sJson = JSON.parse(JSON.stringify(s));
  const rOriginal = recall(s, t0);
  const rRoundTrip = recall(sJson, t0);
  assert.ok(Math.abs(rOriginal - rRoundTrip) < 1e-12,
    `recall diff after round trip: ${Math.abs(rOriginal - rRoundTrip).toFixed(12)}`);
});

/* ── §3 strength() returns 5 values in the specified priority order ─────────── */
test('§3 strength() returns new, fading, gilded, solid, and learning in priority order', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const fresh = newSrs(t0);
  assert.equal(strength(fresh, t0), 'new');

  const faded = review(fresh, Rating.Easy, t0);
  faded.stability = 200;
  const farFuture = new Date('2028-01-01T10:00:00Z');
  assert.ok(recall(faded, farFuture) < 0.8);
  assert.equal(strength(faded, farFuture), 'fading');

  const gilded = review(fresh, Rating.Easy, t0);
  gilded.stability = 180;
  assert.equal(strength(gilded, t0), 'gilded');

  const solid = review(fresh, Rating.Good, t0);
  solid.stability = 30;
  assert.equal(strength(solid, t0), 'solid');

  const learning = review(fresh, Rating.Good, t0);
  learning.stability = 5;
  assert.equal(strength(learning, t0), 'learning');
});

/* ── Store attacks ──────────────────────────────────────────────────────────── */

test('§7 load() must never throw', () => {
  const st = fakeStorage();
  const corruptInputs = [
    '{broken',
    'null',
    '[]',
    '42',
    '"x"',
    '{}',
    '{"version":1}',
    '{"version":1,"srs":null,"drills":[]}',
    '{"version":1,"srs":{},"drills":{}}',
    '{"version":1,"srs":{},"drills":[],"images":[]}',
    '{"version":1,"srs":{},"drills":[],"locusStats":5}',
    '{"version":1,"srs":{},"drills":[],"streak":"x"}',
    '{"version":1,"srs":{},"drills":[],"settings":null}',
    '{"version":1,"srs":[],"drills":[]}',
    '{"version":1,"srs":{},"drills":[],"settings":[]}',
    '{"version":1,"srs":{},"drills":[],"version":"1"}',
  ];
  for (const input of corruptInputs) {
    st.m.clear();
    st.setItem('memory-palace/v1', input);
    try {
      const loaded = load(st);
      assert.equal(typeof loaded.version, 'number');
      assert.ok(loaded.images && typeof loaded.images === 'object' && !Array.isArray(loaded.images));
      assert.ok(loaded.srs && typeof loaded.srs === 'object' && !Array.isArray(loaded.srs));
      assert.ok(Array.isArray(loaded.drills));
      assert.ok(loaded.locusStats && typeof loaded.locusStats === 'object' && !Array.isArray(loaded.locusStats));
      assert.ok(loaded.streak && typeof loaded.streak.lastDay === 'string');
      assert.ok(loaded.settings && typeof loaded.settings.glideMs === 'number');
      assert.equal(st.m.get('memory-palace/v1/corrupt'), input);
    } catch (e) {
      assert.fail(`load() threw on input "${input.substring(0, 20)}": ${e}`);
    }
  }
});

test('§7 load() returns a fresh save if storage reads or corrupt backups throw', () => {
  const unreadable = { getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
  assert.deepEqual(load(unreadable), emptySave());

  const backupFails = {
    getItem: () => '{broken',
    setItem: () => { throw new Error('quota'); },
  };
  assert.deepEqual(load(backupFails), emptySave());
});

test('§7 valid minimal save is repaired with correctly typed defaults and preserves valid values', () => {
  const repaired = importJson('{"version":1,"srs":{},"drills":[],"settings":{"sound":true}}');
  assert.equal(repaired.version, 1);
  assert.ok(!Array.isArray(repaired.images));
  assert.deepEqual(repaired.srs, {});
  assert.deepEqual(repaired.drills, []);
  assert.deepEqual(repaired.locusStats, {});
  assert.deepEqual(repaired.streak, { lastDay: '', count: 0, freezes: 0 });
  assert.deepEqual(repaired.settings, { glideMs: 600, sound: true, colorSafe: false, captions: true });
});

test('§7 importJson throws Error("Not a memory palace save file") for bad inputs', () => {
  const st = fakeStorage();
  const badInputs = [
    '{broken',
    'null',
    '[]',
    '42',
    '"x"',
    '{}',
    '{"version":1}',
    '{"version":2,"srs":{},"drills":[]}',
    '{"version":"1","srs":{},"drills":[]}',
    '{"version":1,"srs":null,"drills":[]}',
    '{"version":1,"srs":{},"drills":{}}',
    '{"version":1,"srs":{},"drills":[],"images":[]}',
    '{"version":1,"srs":{},"drills":[],"locusStats":5}',
    '{"version":1,"srs":{},"drills":[],"streak":"x"}',
    '{"version":1,"srs":{},"drills":[],"settings":null}',
    '{"version":1,"srs":[],"drills":[]}',
    '{"version":1,"srs":{},"drills":[],"settings":[]}',
  ];
  for (const input of badInputs) {
    assert.throws(
      () => importJson(input),
      (error: unknown) => error instanceof Error && error.message === 'Not a memory palace save file',
      `importJson should reject ${input.substring(0, 40)} with the standard error`,
    );
  }
});

/* ── §8 localDay ─────────────────────────────────────────────────────────────── */

test('§8 localDay: date at 23:30 and 00:30 gives right local day', () => {
  const d2330 = new Date(2026, 0, 15, 23, 30);
  assert.equal(localDay(d2330), '2026-01-15', '23:30 should give same local day');
  const d0030 = new Date(2026, 0, 15, 0, 30);
  assert.equal(localDay(d0030), '2026-01-15', '00:30 should give same local day, not previous');
});

test('MATHS.md w20 matches the ts-fsrs weight srs.ts uses', () => {
  const doc = readFileSync(new URL('../MATHS.md', import.meta.url), 'utf8');
  const match = /w20 = ([0-9.]+)/.exec(doc);
  assert.ok(match, 'MATHS.md states w20');
  assert.equal(Number(match[1]), default_w[20]);
});
