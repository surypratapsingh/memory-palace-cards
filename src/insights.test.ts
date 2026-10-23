import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confusions, speedTrend, weakCards } from './insights.ts';
import type { CardId, DrillResult } from './types.ts';

const NOW = new Date('2026-10-23T12:00:00.000Z');

function drill(
  at: string,
  answers: (CardId | null)[],
  memorizeMs = 10000,
  mode?: 'speed',
): DrillResult {
  const sequence: CardId[] = ['AS', '2S', '3S', '4S', '5S'];
  return { at, seed: 'test', daily: false, sequence, answers, memorizeMs, recallMs: 0, ...(mode ? { mode } : {}) };
}

const workedDrills = (): DrillResult[] => [
  drill('2026-10-20T10:00:00Z', ['2S', 'AS', '9S', '4S', '5S'], 10000),
  drill('2026-10-21T10:00:00Z', ['2S', 'AS', '3S', '4S', '5S'], 8000),
  drill('2026-10-22T10:00:00Z', ['2S', 'AS', '3S', '4S', '5S'], 6000),
];

const malformed = (patch: Record<string, unknown>) => ({
  at: '2026-10-20T10:00:00Z',
  seed: 'bad',
  daily: false,
  sequence: ['AS', '2S'],
  answers: ['AS', null],
  memorizeMs: 1000,
  recallMs: 0,
  ...patch,
}) as unknown as DrillResult;

test('worked example: swap pairs are order-free and blanks are not confusions', () => {
  assert.deepEqual(confusions(workedDrills()), [
    { expected: 'AS', given: '2S', count: 6, kind: 'swap' },
    { expected: '3S', given: '9S', count: 1, kind: 'substitution' },
  ]);
});

test('worked example: weak cards use the global mean and Beta prior strength five', () => {
  const cards = weakCards(workedDrills(), NOW);
  assert.deepEqual(cards.map(({ card, tries, misses }) => ({ card, tries, misses })), [
    { card: 'AS', tries: 3, misses: 3 },
    { card: '2S', tries: 3, misses: 3 },
  ]);
  assert.ok(cards.every(({ rate }) => Math.abs(rate - 2 / 3) < 1e-12));
});

test('worked example: speed points are seconds per card and slope is per drill', () => {
  const trend = speedTrend(workedDrills(), 1);
  assert.deepEqual(trend.points, [2, 1.6, 1.2]);
  assert.ok(Math.abs(trend.slope - -0.4) < 1e-12);
  assert.equal(trend.improving, false);
});

test('confusions classifies a card within two loci as swap, but a more distant card as substitution', () => {
  const near = drill('2026-10-20T10:00:00Z', ['3S', 'AS', '2S', '4S', '5S']);
  const far = drill('2026-10-21T10:00:00Z', ['4S', 'AS', '3S', '4S', '5S']);
  const result = confusions([near, far]);
  assert.equal(result.find((item) => item.kind === 'swap')?.count, 2);
  assert.ok(result.some((item) => item.kind === 'substitution' && item.expected === 'AS' && item.given === '4S'));
});

test('confusions preserve substitution direction and group repeated pairs', () => {
  const first = drill('2026-10-20T10:00:00Z', ['AS', 'AH', '3S', '4S', '5S']);
  const second = drill('2026-10-21T10:00:00Z', ['AS', 'AH', '3S', '4S', '5S']);
  const result = confusions([first, second]);
  assert.equal(result.find((item) => item.expected === '2S' && item.given === 'AH')?.count, 2);
  assert.equal(result.find((item) => item.expected === 'AH' && item.given === '2S'), undefined);
});

test('confusions on a reversed 52-card deck only classifies nearby placements as swaps', () => {
  const sequence = ('A23456789TJQK'.split('').flatMap((rank) => ['S', 'H', 'D', 'C'].map((suit) => `${rank}${suit}`))) as CardId[];
  const reversed = malformed({ sequence, answers: [...sequence].reverse() });
  const result = confusions([reversed], 100);
  assert.equal(result.filter(({ kind }) => kind === 'swap').length, 1);
  assert.equal(result.find(({ kind }) => kind === 'swap')?.count, 2);
  assert.equal(result.reduce((sum, item) => sum + item.count, 0), 52);
});

test('Speed Cards remain in confusion and weak-card aggregates', () => {
  const speed = drill('2026-10-20T10:00:00Z', ['2S', 'AS', '3S', '4S', '5S'], 1000, 'speed');
  assert.equal(confusions([speed])[0]?.count, 2);
  assert.ok(weakCards([speed, speed, speed], NOW).some(({ card }) => card === 'AS'));
});

test('confusions breaks equal-frequency ties by most recent timestamp', () => {
  const older = drill('2026-10-20T10:00:00Z', ['2S', '2S', '3S', '4S', '5S']);
  const newer = drill('2026-10-22T10:00:00Z', ['AS', '2S', '3S', '5S', '5S']);
  assert.deepEqual(confusions([newer, older], 2).map(({ expected, given }) => [expected, given]), [['4S', '5S'], ['AS', '2S']]);
});

test('confusions handles short and long answers without indexing beyond the sequence', () => {
  const short = malformed({ sequence: ['AS', '2S'], answers: ['2S'] });
  const long = malformed({ sequence: ['AS'], answers: ['2S', 'AS', '3S'] });
  assert.deepEqual(confusions([short, long]).map(({ count, kind }) => [count, kind]), [[1, 'substitution'], [1, 'swap']]);
});

test('all-null answers create no confusion pairs and count as weak-card misses', () => {
  const allNull = drill('2026-10-20T10:00:00Z', [null, null, null, null, null]);
  assert.deepEqual(confusions([allNull]), []);
  assert.deepEqual(weakCards([allNull, allNull, allNull], NOW), []);
});

test('confusions ignores unknown ids, correct answers, nulls, empty drills, and invalid records', () => {
  const bad = malformed({ sequence: ['JOKER', 'AS', '2S'], answers: ['AS', 'AS', 'JOKER'] });
  assert.deepEqual(confusions([bad, malformed({ sequence: [], answers: [] }), null as unknown as DrillResult]), []);
  assert.deepEqual(confusions([]), []);
});

test('confusions limit is floored, clamped, and safe for non-finite values', () => {
  const history = workedDrills();
  assert.equal(confusions(history, 1.9).length, 1);
  assert.deepEqual(confusions(history, -1), []);
  assert.deepEqual(confusions(history, Number.NaN), []);
});

test('weakCards needs three tries and an inclusive relative margin; blanks count as misses', () => {
  const history = [
    drill('2026-10-20T10:00:00Z', [null, '2S', '3S', '4S', '5S']),
    drill('2026-10-21T10:00:00Z', [null, '2S', '3S', '4S', '5S']),
    drill('2026-10-22T10:00:00Z', [null, '2S', '3S', '4S', '5S']),
  ];
  assert.deepEqual(weakCards(history, NOW).map(({ card, tries, misses }) => ({ card, tries, misses })), [
    { card: 'AS', tries: 3, misses: 3 },
  ]);
  assert.deepEqual(weakCards(history.slice(0, 2), NOW), []);
});

test('weakCards ignores invalid card ids and invalid answers instead of throwing', () => {
  const bad = malformed({ sequence: ['AS', 'BOGUS', '2S'], answers: ['BOGUS', 'AS', 'NOPE'] });
  assert.deepEqual(weakCards([bad], NOW), []);
  assert.deepEqual(weakCards([], NOW), []);
});

test('weakCards ranks worst first, breaks ties in deck order, and applies its limit', () => {
  const history = workedDrills();
  assert.deepEqual(weakCards(history, NOW, 1).map(({ card }) => card), ['AS']);
  assert.deepEqual(weakCards(history, NOW, -1), []);
});

test('weakCards returns an empty result for an invalid now date', () => {
  assert.deepEqual(weakCards(workedDrills(), new Date(Number.NaN)), []);
});

test('speedTrend excludes speed drills and invalid times, and requires five samples to say improving', () => {
  const history = Array.from({ length: 5 }, (_, index) => drill(
    `2026-10-${String(18 + index).padStart(2, '0')}T10:00:00Z`,
    ['AS', '2S', '3S', '4S', '5S'],
    (10000 - index * 1000),
  ));
  history.push(drill('2026-10-23T10:00:00Z', ['AS', '2S', '3S', '4S', '5S'], 1, 'speed'));
  history.push(malformed({ at: '2026-10-24T10:00:00Z', memorizeMs: Number.NaN }));
  const trend = speedTrend(history, 1);
  assert.deepEqual(trend.points, [2, 1.8, 1.6, 1.4, 1.2]);
  assert.ok(trend.slope < 0);
  assert.equal(trend.improving, true);
});

test('speedTrend retains only the last 20 chronologically sorted drills at the level', () => {
  const history = Array.from({ length: 25 }, (_, index) => drill(
    `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
    ['AS', '2S', '3S', '4S', '5S'],
    (index + 1) * 5000,
  )).reverse();
  const trend = speedTrend(history, 1);
  assert.equal(trend.points.length, 20);
  assert.deepEqual(trend.points, Array.from({ length: 20 }, (_, index) => (index + 6) * 1));
});

test('speedTrend excludes mismatched levels, malformed sequences, NaN times and negative durations', () => {
  const history = [
    malformed({ sequence: ['AS', '2S'], answers: ['AS', '2S'], memorizeMs: 10 }),
    malformed({ sequence: ['AS', '2S', 'JOKER', '4S', '5S'], memorizeMs: 10 }),
    malformed({ memorizeMs: Number.NaN }),
    malformed({ memorizeMs: -1 }),
    malformed({ at: 'not a date', memorizeMs: 10 }),
  ];
  assert.deepEqual(speedTrend(history, 1), { points: [], slope: 0, improving: false });
});

test('speedTrend is neutral for empty histories and invalid levels', () => {
  assert.deepEqual(speedTrend([], 0), { points: [], slope: 0, improving: false });
  assert.deepEqual(speedTrend(workedDrills(), -1), { points: [], slope: 0, improving: false });
  assert.deepEqual(speedTrend(workedDrills(), 99), { points: [], slope: 0, improving: false });
});
