import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK, deal, score, localDay, rng } from '../deck.ts';
import { Rating, newSrs, recall, review, strength } from '../srs.ts';
import { emptySave, importJson, load } from '../store.ts';

const fakeStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  } as const;
};

function chiSquare(counts: readonly number[], expected: number): number {
  let sum = 0;
  for (const c of counts) {
    const d = c - expected;
    sum += (d * d) / expected;
  }
  return sum;
}

// ── Attack 1: Check 1 from MATHS.md table (52 bins, E=200, limit ≤ 87.97) ──────
test('redteam: §1 first card of deal(1, "s"+i) across 52 bins (cards), chi-square ≤ 87.97', () => {
  const cardIndex = new Map(DECK.map((c, i) => [c, i]));
  const counts = new Array(52).fill(0);
  for (let i = 0; i < 10400; i++) {
    const card = deal(1, 's' + i)[0];
    const idx = cardIndex.get(card)!;
    counts[idx]++;
  }
  const chi = chiSquare(counts, 200);
  assert.ok(chi <= 87.97, `chi-square across 52 cards was ${chi.toFixed(2)}, expected ≤ 87.97`);
});

// ── Attack 2: Check 2 from MATHS.md table (Position of AS in deal(52, "p"+i), E=200)
test('redteam: §1 position of AS in deal(52, "p"+i) across 52 bins, chi-square ≤ 87.97', () => {
  const counts = new Array(52).fill(0);
  for (let i = 0; i < 10400; i++) {
    const cards = deal(52, 'p' + i);
    const pos = cards.indexOf('AS');
    counts[pos]++;
  }
  const chi = chiSquare(counts, 200);
  assert.ok(chi <= 87.97, `chi-square of AS position was ${chi.toFixed(2)}, expected ≤ 87.97`);
});

// ── Attack 3: Check 3 from MATHS.md table (Daily Deck for 1092 days, E=21) ─────
test('redteam: §1 first card of Daily Deck over 1092 consecutive days from 2026-01-01', () => {
  const cardIndex = new Map(DECK.map((c, i) => [c, i]));
  const counts = new Array(52).fill(0);
  const start = new Date(2026, 0, 1);
  for (let i = 0; i < 1092; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const daySeed = localDay(d);
    const card = deal(1, daySeed)[0];
    const idx = cardIndex.get(card)!;
    counts[idx]++;
  }
  const chi = chiSquare(counts, 21);
  assert.ok(chi <= 87.97, `chi-square for Daily Deck was ${chi.toFixed(2)}, expected ≤ 87.97`);
});

// ── Attack 4: Actual score() function tested with deterministic rng ────────────
test('redteam: §2 score() on 1000 deals with deterministic seed', () => {
  const rand = rng('redteam-score-seed');
  for (let i = 0; i < 1000; i++) {
    const seq = deal(52, 'seq' + i);
    const answers: (string | null)[] = [];
    for (let j = 0; j < seq.length; j++) {
      answers.push(rand() < 0.6 ? seq[j] : (rand() < 0.5 ? null : 'AS'));
    }
    const res = score(seq, answers as any);
    assert.ok(0 <= res.run && res.run <= res.correct && res.correct <= seq.length);
    const firstMismatch = answers.findIndex((a, idx) => a !== seq[idx]);
    const expectedRun = firstMismatch === -1 ? seq.length : firstMismatch;
    assert.equal(res.run, expectedRun, `score().run must equal first mismatch index at iteration ${i}`);
  }
});

// ── Attack 5: strength() for all 5 values in exact priority order ──────────────
test('redteam: §3 strength() returns all 5 values and respects priority order', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');

  // 1. New card -> 'new'
  const sNew = newSrs(t0);
  assert.equal(strength(sNew, t0), 'new');

  // 2. Fading (recall < 0.8) even if stability is high
  const sGildedDecayed = review(sNew, Rating.Easy, t0);
  // Manually set high stability
  sGildedDecayed.stability = 200;
  // Way in the future -> recall decays below 0.8
  const farFuture = new Date('2028-01-01T10:00:00Z');
  assert.ok(recall(sGildedDecayed, farFuture) < 0.8);
  assert.equal(strength(sGildedDecayed, farFuture), 'fading', 'decayed card must be fading before gilded');

  // 3. Gilded (S >= 180 and recall >= 0.8)
  const sGilded = review(sNew, Rating.Easy, t0);
  sGilded.stability = 180;
  assert.ok(recall(sGilded, t0) >= 0.8);
  assert.equal(strength(sGilded, t0), 'gilded');

  // 4. Solid (S >= 30 and recall >= 0.8)
  const sSolid = review(sNew, Rating.Good, t0);
  sSolid.stability = 30;
  assert.ok(recall(sSolid, t0) >= 0.8);
  assert.equal(strength(sSolid, t0), 'solid');

  // 5. Learning (S < 30 and recall >= 0.8)
  const sLearning = review(sNew, Rating.Good, t0);
  sLearning.stability = 5;
  assert.ok(recall(sLearning, t0) >= 0.8);
  assert.equal(strength(sLearning, t0), 'learning');
});

// ── Attack 6: store.load() actually loads corrupt data from storage ────────────
test('redteam: §7 load() handles corrupt inputs placed in storage without throwing', () => {
  const st = fakeStorage();
  const corruptInputs = [
    '{broken',
    'null',
    '[]',
    '42',
    '"x"',
    '{}',
    '{"version":1}',
    '{"version":1,"srs":null}',
    '{"version":1,"drills":{}}',
    '{"version":1,"streak":"invalid"}',
  ];
  for (const input of corruptInputs) {
    st.m.clear();
    st.setItem('memory-palace/v1', input);
    let loaded;
    assert.doesNotThrow(() => {
      loaded = load(st as any);
    }, `load() threw on corrupt input ${input}`);
    assert.equal(loaded.version, 1);
    assert.ok(typeof loaded.srs === 'object' && loaded.srs !== null);
    assert.ok(Array.isArray(loaded.drills));
    assert.ok(typeof loaded.streak === 'object' && loaded.streak !== null);
  }
});

// ── Attack 7: importJson rejects complete save with version != 1 ───────────────
test('redteam: §7 importJson rejects complete save with version != 1 or string version', () => {
  const fullSaveV2 = { ...emptySave(), version: 2 };
  assert.throws(
    () => importJson(JSON.stringify(fullSaveV2)),
    /Not a memory palace save file/,
    'importJson must reject complete save with version 2',
  );

  const fullSaveStr = { ...emptySave(), version: '1' };
  assert.throws(
    () => importJson(JSON.stringify(fullSaveStr)),
    /Not a memory palace save file/,
    'importJson must reject complete save with string version "1"',
  );
});
