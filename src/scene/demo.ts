// Dev harness logic for scene-demo.html.
// Hotkeys: Right/Left, C, G, X, H, F, 0, 6.
// Exposes window.__view for verification.
import { createPalaceView } from './palaceView.ts';
import { DECK, cardLabel, deal } from '../deck.ts';
import type { CardId, LocusMood, PalaceView } from '../types.ts';

declare global {
  interface Window {
    __view: PalaceView;
  }
}

const container = document.getElementById('scene-container');
if (!container) {
  throw new Error('Missing #scene-container');
}

const view = createPalaceView(container);
window.__view = view;

let currentIndex = 0;
let isFreeWalk = false;
let glideSpeedMs = 600;
let ghostOpacity = false;
const shownCards = new Map<number, CardId>();
const locusMoods = new Map<number, LocusMood>();

const locusTitleEl = document.getElementById('locus-title');
const roomTitleEl = document.getElementById('room-title');
const modeValEl = document.getElementById('mode-val');
const glideValEl = document.getElementById('glide-val');
const moodValEl = document.getElementById('mood-val');
const cardValEl = document.getElementById('card-val');

function updateHud(): void {
  const locus = view.loci[currentIndex];
  if (locusTitleEl) {
    locusTitleEl.textContent = `Locus ${locus.index + 1}: ${locus.name}`;
  }
  if (roomTitleEl) {
    roomTitleEl.textContent = locus.room;
  }
  if (modeValEl) {
    modeValEl.textContent = isFreeWalk ? 'Free Walk (WASD)' : 'Guided';
  }
  if (glideValEl) {
    glideValEl.textContent = `${glideSpeedMs} ms`;
  }
  if (moodValEl) {
    moodValEl.textContent = locusMoods.get(currentIndex) ?? 'normal';
  }
  if (cardValEl) {
    const card = shownCards.get(currentIndex);
    cardValEl.textContent = card ? cardLabel(card) : 'none';
  }
}

// Sample mnemonics for demonstration
const SAMPLE_CAPTIONS: Record<string, string> = {
  AS: 'Ancient sword planted in stone',
  KS: 'Knight in shimmering steel armor',
  QS: 'Queen holding a black rose',
  JS: 'Jester balancing spinning plates',
  TS: 'Tower crumbling into the sea',
  AH: 'Cupid firing a glowing heart arrow',
  KH: 'King wrapped in velvet robes',
  QH: 'Queen admiring a ruby necklace',
  JH: 'Jug of mulled red wine',
  TH: 'Torch ablaze with scarlet fire',
  AD: 'Sparkling diamond floating in air',
  KD: 'Dragon perched on mountain of gold',
  QD: 'Queen crowned with crystal jewels',
  JD: 'Juggler tossing gold coins',
  TD: 'Treasure chest spilling gems',
  AC: 'Four-leaf clover glistening with dew',
  KC: 'Colossal oak tree in storm',
  QC: 'Queen leading a pack of wolves',
  JC: 'Jockey riding a wild mustang',
  TC: 'Cannon firing billowing smoke',
};

// Check query params for initial locus / card
const urlParams = new URLSearchParams(window.location.search);
const paramLocus = parseInt(urlParams.get('locus') ?? '0', 10);
if (!isNaN(paramLocus) && paramLocus >= 0 && paramLocus < view.loci.length) {
  currentIndex = paramLocus;
  view.setGlideMs(0);
  view.glideTo(currentIndex);
  view.setGlideMs(glideSpeedMs);
  if (urlParams.get('card') === '1') {
    const card: CardId = (urlParams.get('cardId') as CardId) || 'AS';
    shownCards.set(currentIndex, card);
    view.showCard(currentIndex, card, {
      caption: SAMPLE_CAPTIONS[card] ?? 'A vivid card image',
    });
  }
}

updateHud();

// Hotkeys
window.addEventListener('keydown', (e: KeyboardEvent) => {
  // Avoid interfering if an input has focus
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    currentIndex = (currentIndex + 1) % view.loci.length;
    view.glideTo(currentIndex);
    updateHud();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    currentIndex = (currentIndex - 1 + view.loci.length) % view.loci.length;
    view.glideTo(currentIndex);
    updateHud();
  } else if (e.key === 'c' || e.key === 'C') {
    // Random card at current locus
    const randomCard = deal(1, String(Date.now()))[0] ?? DECK[currentIndex % DECK.length];
    shownCards.set(currentIndex, randomCard);
    const caption = SAMPLE_CAPTIONS[randomCard] ?? 'A vivid card image';
    view.showCard(currentIndex, randomCard, {
      caption,
      opacity: ghostOpacity ? 0.25 : 1.0,
    });
    updateHud();
  } else if (e.key === 'g' || e.key === 'G') {
    // Toggle all shown cards opacity to 0.25 or 1.0
    ghostOpacity = !ghostOpacity;
    for (const [idx, card] of shownCards.entries()) {
      const caption = SAMPLE_CAPTIONS[card] ?? 'A vivid card image';
      view.showCard(idx, card, {
        caption,
        opacity: ghostOpacity ? 0.25 : 1.0,
      });
    }
    updateHud();
  } else if (e.key === 'x' || e.key === 'X') {
    // Toggle weak mood
    const currentMood = locusMoods.get(currentIndex) ?? 'normal';
    const nextMood = currentMood === 'weak' ? 'normal' : 'weak';
    locusMoods.set(currentIndex, nextMood);
    view.setLocusMood(currentIndex, nextMood);
    updateHud();
  } else if (e.key === 'h' || e.key === 'H') {
    // Toggle highlight mood
    const currentMood = locusMoods.get(currentIndex) ?? 'normal';
    const nextMood = currentMood === 'highlight' ? 'normal' : 'highlight';
    locusMoods.set(currentIndex, nextMood);
    view.setLocusMood(currentIndex, nextMood);
    updateHud();
  } else if (e.key === 'f' || e.key === 'F') {
    // Toggle free walk
    isFreeWalk = !isFreeWalk;
    view.setFreeWalk(isFreeWalk);
    updateHud();
  } else if (e.key === '0') {
    glideSpeedMs = 0;
    view.setGlideMs(0);
    updateHud();
  } else if (e.key === '6') {
    glideSpeedMs = 600;
    view.setGlideMs(600);
    updateHud();
  }
});

// Raycasting locus click
view.onLocusClick((idx) => {
  currentIndex = idx;
  view.glideTo(idx);
  updateHud();
});

// Log renderer.info.render.calls in scene demo
const demoRenderer = (view as unknown as { renderer?: { info: { render: { calls: number; triangles: number } } } }).renderer;
if (demoRenderer) {
  const hudEl = document.getElementById('hud');
  let callsValEl: HTMLElement | null = null;
  if (hudEl) {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'status-line';
    statsDiv.textContent = 'Draw Calls: ';
    callsValEl = statsDiv.appendChild(document.createElement('span'));
    callsValEl.className = 'status-val';
    callsValEl.textContent = '0';
    hudEl.appendChild(statsDiv);
  }

  setInterval(() => {
    const calls = demoRenderer.info.render.calls;
    const triangles = demoRenderer.info.render.triangles;
    if (callsValEl) {
      callsValEl.textContent = `${calls} (${triangles} tris)`;
    }
    console.log(`[scene-demo] draw calls: ${calls}, triangles: ${triangles}`);
  }, 1000);
}

