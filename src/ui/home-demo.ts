import { mountHome } from './home.ts';
import { emptySave } from '../store.ts';
import { DECK, LADDER, deal, localDay } from '../deck.ts';
import { newSrs, review, Rating } from '../srs.ts';
import type { CardId, DrillResult, SaveData, SrsState } from '../types.ts';

function create30DrillDemoSave(): SaveData {
  const today = localDay();
  const drills: DrillResult[] = [];

  // 30 drills over past 20 days
  for (let i = 29; i >= 0; i--) {
    const isToday = i === 0;
    const dayOffset = Math.floor(i * 0.7);
    const date = new Date(Date.now() - dayOffset * 86400000);
    const dateStr = localDay(date);

    // Ladder levels: 0 (3 cards), 1 (5 cards), 2 (8 cards), 3 (13 cards)
    const level = i % 4;
    const count = LADDER[level];
    const seq = deal(count, `demo-seed-${i}`);
    const isPerfect = i % 3 !== 1; // 2 out of 3 drills are perfect

    const answers = isPerfect
      ? [...seq]
      : seq.map((c, idx) => (idx === seq.length - 1 ? null : c));

    const memorizeMs = (10 + level * 8 + (i % 5)) * 1000;

    drills.push({
      at: date.toISOString(),
      seed: isToday ? today : dateStr,
      daily: isToday || i % 5 === 0,
      sequence: seq,
      answers,
      memorizeMs,
      recallMs: 15000,
    });
  }

  // Create varied SRS states for DECK cards
  const srs: Partial<Record<CardId, SrsState>> = {};
  const baseDate = new Date();

  DECK.forEach((card, index) => {
    // Leave 10 cards without SRS (new cards)
    if (index >= 42) return;

    let s = newSrs(baseDate);
    if (index < 10) {
      // Gilded: stability >= 180 (multiple Good/Easy reviews)
      for (let r = 0; r < 5; r++) {
        s = review(s, Rating.Easy, baseDate);
      }
      s.stability = 200;
    } else if (index < 25) {
      // Solid: stability >= 30
      for (let r = 0; r < 3; r++) {
        s = review(s, Rating.Good, baseDate);
      }
      s.stability = 45;
    } else if (index < 35) {
      // Learning
      s = review(s, Rating.Good, baseDate);
    } else {
      // Fading: due in the past
      s = review(s, Rating.Hard, new Date(Date.now() - 30 * 86400000));
      s.due = new Date(Date.now() - 10 * 86400000);
    }
    srs[card] = s;
  });

  return {
    version: 1,
    images: {},
    srs,
    drills,
    locusStats: {},
    streak: {
      lastDay: today,
      count: 14,
      freezes: 2,
    },
    settings: {
      glideMs: 600,
      sound: true,
      colorSafe: false,
      captions: true,
    },
  };
}

const appEl = document.getElementById('app');
const logEl = document.getElementById('demo-log');
const btnEmpty = document.getElementById('btn-empty');
const btnDrills = document.getElementById('btn-drills');

if (!appEl || !logEl || !btnEmpty || !btnDrills) {
  throw new Error('Demo harness DOM elements missing');
}

let unmountCurrent: (() => void) | null = null;
const isUrlEmpty = window.location.search.includes('save=empty');
let currentSave: SaveData = isUrlEmpty ? emptySave() : create30DrillDemoSave();

function log(msg: string) {
  logEl!.textContent = `${new Date().toLocaleTimeString()}: ${msg}`;
}

function render(data: SaveData) {
  if (unmountCurrent) {
    unmountCurrent();
    unmountCurrent = null;
  }
  currentSave = data;
  unmountCurrent = mountHome(appEl!, currentSave, {
    train() {
      log('Action: train()');
    },
    drill(level, daily) {
      log(`Action: drill(level=${level}, daily=${daily})`);
    },
    settings() {
      log('Action: settings()');
    },
    replaceSave(next) {
      log('Action: replaceSave()');
      render(next);
    },
  });
}

btnEmpty.addEventListener('click', () => {
  log('Loaded empty save');
  render(emptySave());
});

btnDrills.addEventListener('click', () => {
  log('Loaded 30-drill save');
  render(create30DrillDemoSave());
});

// Initial render with 30-drill save
render(currentSave);
log('Initialized with 30-drill save');
