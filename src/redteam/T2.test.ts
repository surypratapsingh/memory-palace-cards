import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_IMAGES } from '../data/cardImages.ts';
import { DECK } from '../deck.ts';

const RANK_OBJECTS: Record<string, string> = {
  A: 'rocket',
  '2': 'swan',
  '3': 'trident',
  '4': 'sailboat',
  '5': 'giant hand',
  '6': 'snail',
  '7': 'boomerang',
  '8': 'snowman',
  '9': 'balloon',
  T: 'bat and ball',
  J: 'jester',
  Q: 'queen',
  K: 'king',
};

const SUIT_NAMES: Record<string, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

test('redteam: exactly 52 cards in exact deck order with T for ten', () => {
  assert.equal(CARD_IMAGES.length, 52);
  const ids = CARD_IMAGES.map((c) => c.card);

  // Check against DECK order
  assert.deepEqual(ids, DECK as string[]);

  // Check no '10' used instead of 'T'
  for (const c of CARD_IMAGES) {
    assert.ok(!c.card.startsWith('10'), `card ${c.card} should use T for ten`);
  }
});

test('redteam: hook format regex matches "<rank> = <object>, <Suit name> = <flavour word>"', () => {
  for (const c of CARD_IMAGES) {
    const rank = c.card[0];
    const suit = c.card[1];
    const expectedObj = RANK_OBJECTS[rank];
    const expectedSuitName = SUIT_NAMES[suit];

    // Format: '<rank> = <object>, <Suit name> = <flavour word>'
    const regex = new RegExp(`^${rank} = ${expectedObj}, ${expectedSuitName} = [a-z ]+$`);
    assert.ok(
      regex.test(c.hook),
      `Card ${c.card} hook "${c.hook}" does not match expected format "${rank} = ${expectedObj}, ${expectedSuitName} = <flavour>"`
    );
  }
});

test('redteam: each image contains its rank object word', () => {
  for (const c of CARD_IMAGES) {
    const rank = c.card[0];
    const obj = RANK_OBJECTS[rank];
    const lower = c.image.toLowerCase();

    if (rank === '2') {
      assert.ok(lower.includes('swan'), `Card ${c.card} image "${c.image}" missing "swan"`);
    } else if (rank === '5') {
      assert.ok(
        lower.includes('giant hand') || lower.includes('hand'),
        `Card ${c.card} image "${c.image}" missing "hand"`
      );
    } else if (rank === 'T') {
      assert.ok(
        lower.includes('bat and ball') || (lower.includes('bat') && lower.includes('ball')),
        `Card ${c.card} image "${c.image}" missing "bat and ball"`
      );
    } else {
      assert.ok(lower.includes(obj), `Card ${c.card} image "${c.image}" missing "${obj}"`);
    }
  }
});

test('redteam: every image length is strictly under 60 characters and non-empty', () => {
  for (const c of CARD_IMAGES) {
    assert.ok(c.image.length > 0, `Card ${c.card} image is empty`);
    assert.ok(
      c.image.length < 60,
      `Card ${c.card} image "${c.image}" has length ${c.image.length} (must be < 60)`
    );
  }
});

test('redteam: pairwise word overlap analysis (no two images share > half non-stopwords)', () => {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'of',
    'with',
    'its',
    'their',
    'his',
    'her',
    'in',
    'on',
    'at',
    'to',
    'from',
    'by',
    'into',
    'and',
  ]);

  const wordSets = CARD_IMAGES.map((ci) => {
    const words = ci.image
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .split(/\s+/)
      .filter((w) => w && !stopWords.has(w));
    return { card: ci.card, image: ci.image, words: new Set(words) };
  });

  const highOverlaps: string[] = [];

  for (let i = 0; i < wordSets.length; i++) {
    for (let j = i + 1; j < wordSets.length; j++) {
      const a = wordSets[i];
      const b = wordSets[j];
      let shared = 0;
      for (const w of a.words) {
        if (b.words.has(w)) shared++;
      }
      const minLen = Math.min(a.words.size, b.words.size);
      if (shared > minLen / 2) {
        highOverlaps.push(`${a.card} ("${a.image}") vs ${b.card} ("${b.image}") shared ${shared}/${minLen}`);
      }
    }
  }

  assert.deepEqual(highOverlaps, [], `High overlap image pairs found: ${highOverlaps.join('; ')}`);
});
