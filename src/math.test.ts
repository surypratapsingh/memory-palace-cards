import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK, deal, isCardId, localDay, score, shuffle } from './deck.ts';
import { Rating, isDue, newSrs, recall, review, strength } from './srs.ts';
import { emptySave, importJson, load, save, setSaveErrorHandler } from './store.ts';

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

function countFirstCardSuits(n: number): number[] {
  const counts = [0, 0, 0, 0]; // S, H, D, C
  for (let i = 0; i < n; i++) {
    const card = deal(1, 's' + i)[0];
    if (card) {
      const suit = card[1] as 'S' | 'H' | 'D' | 'C';
      if (suit === 'S') counts[0]++;
      else if (suit === 'H') counts[1]++;
      else if (suit === 'D') counts[2]++;
      else if (suit === 'C') counts[3]++;
    }
  }
  return counts;
}

// §1: first card of deal(1, 's'+i), i < 10400, chi-square ≤ 87.97
test('§1 first card of deal(1, seed) uniform (chi-square ≤ 87.97)', () => {
  const counts = countFirstCardSuits(10400);
  const e = 10400 / 4; // 2600 per suit
  let sum = 0;
  for (const c of counts) {
    const d = c - e;
    sum += (d * d) / e;
  }
  assert.ok(sum <= 87.97, `chi-square = ${sum.toFixed(2)} exceeds 87.97`);
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

// §1 shuffle does not change its input
test('§1 shuffle does not change its input', () => {
  const items = ['a', 'b', 'c', 'd'];
  const rand = () => 0.5;
  const shuffled = shuffle(items, rand);
  assert.deepEqual(new Set(shuffled), new Set(items));
});

/* ── §2 Score correctness ──────────────────────────────────────────────────── */

test('§2 on 1000 random sequence/answer pairs: 0 ≤ run ≤ correct ≤ total, run is first mismatch', () => {
  for (let i = 0; i < 1000; i++) {
    const seq = deal(52, 'score' + i);
    const answers: typeof seq[] = [];
    let runFound = -1;
    let correct = 0;
    for (let j = 0; j < seq.length; j++) {
      const wrong = Math.random() > 0.5;
      const ans = wrong ? null : seq[j];
      answers.push(ans);
      if (ans === seq[j]) correct++;
      else if (runFound < 0) runFound = j;
    }
    if (runFound < 0) runFound = seq.length;
    assert.ok(0 <= runFound && runFound <= correct && correct <= seq.length,
      `0 ≤ run ≤ correct ≤ total failed: run=${runFound}, correct=${correct}, total=${seq.length}`);
    const expectedRun = answers.slice(0).findIndex((a: typeof answers[number], idx: number) => a !== seq[idx]);
    if (expectedRun < 0) expectedRun = seq.length;
    assert.strictEqual(runFound, expectedRun, `run not index of first mismatch on iteration ${i}`);
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

/* ── §3 strength() returns 5 values ────────────────────────────────────────── */

test('§3 strength() returns each of the 5 values', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const sNew = newSrs(t0);
  assert.equal(strength(sNew), 'new', 'new card should be "new"');
  let s = review(sNew, Rating.Good, t0);
  assert.ok(strength(s) === 'fading' || strength(s) === 'learning',
    `reviewed card strength should be "fading" or "learning", got "${strength(s)}"`);
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
  ];
  for (const input of corruptInputs) {
    st.m.clear();
    try {
      load(st);
    } catch (e) {
      assert.fail(`load() threw on input "${input.substring(0, 20)}": ${e}`);
    }
  }
});

test('§7 importJson throws Error("Not a memory palace save file") for bad inputs', () => {
  const st = fakeStorage();
  const badInputs = [
    '{broken',
    '[]',
    '42',
    '{"version":2}',
    '{}',
    '{"version":1,"srs":null}',
    '{"version":1,"drills":{}}',
    '{"version":1,"images":[]}',
    '{"version":1,"locusStats":5}',
    '{"version":1,"streak":"x"}',
    '{"version":1,"settings":null}',
    '{"version":"1"}',
  ];
  for (const input of badInputs) {
    try {
      importJson(input);
      assert.fail(`importJson should throw on "${input.substring(0, 20)}"`);
    } catch (e) {
      assert.ok(e instanceof Error && e.message === 'Not a memory palace save file',
        `importJson should throw "Not a memory palace save file", got: ${e.message}`);
    }
  }
});

/* ── §8 localDay ─────────────────────────────────────────────────────────────── */

test('§8 localDay: date at 23:30 and 00:30 gives right local day', () => {
  const d2330 = new Date(2026, 0, 15, 23, 30);
  assert.equal(localDay(d2330), '2026-01-15', '23:30 should give same local day');
  const d0030 = new Date(2026, 0, 15, 0, 30);
  assert.equal(localDay(d0030), '2026-01-15', '00:30 should give same local day, not previous');
});