import { cardLabel, isRed, RANKS, SUITS } from '../deck.ts';
import { SUIT_PATHS, suitColour } from './cardArt.ts';
import type { CardId, Rank, Suit } from '../types.ts';

export interface CardPickerOptions {
  usedCards: ReadonlySet<CardId>;
  pendingRank?: string | null;
  onPick: (card: CardId) => void;
}

export interface CardPickerInstance {
  readonly element: HTMLElement;
  update(opts: { usedCards: ReadonlySet<CardId>; pendingRank?: string | null }): void;
  destroy(): void;
}

export function createCardPicker(options: CardPickerOptions): CardPickerInstance {
  const container = document.createElement('div');
  container.className = 'card-picker';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Card picker');

  const cardButtons = new Map<CardId, HTMLButtonElement>();
  const clickHandlers = new Map<CardId, () => void>();

  for (const suit of SUITS) {
    const row = document.createElement('div');
    row.className = 'picker-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', suit === 'S' ? 'Spades' : suit === 'H' ? 'Hearts' : suit === 'D' ? 'Diamonds' : 'Clubs');
    for (const rank of RANKS) {
      const cardId = `${rank}${suit}` as CardId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = isRed(cardId) ? 'picker-card red' : 'picker-card';
      btn.setAttribute('aria-label', cardLabel(cardId));
      btn.textContent = cardLabel(cardId);
      btn.dataset.card = cardId;
      const theme = document.documentElement.classList.contains('color-safe') ? 'four-colour' : 'classic';
      const colour = suitColour(suit, theme);
      const rankLabel = rank === 'T' ? '10' : rank;
      btn.innerHTML = `<svg class="picker-mini-card" viewBox="0 0 48 68" aria-hidden="true" focusable="false"><rect x="1" y="1" width="46" height="66" rx="5" fill="#fffdf8" stroke="#d6d3d1"/><text x="5" y="15" fill="${colour}" font-size="12" font-family="system-ui,sans-serif" font-weight="700">${rankLabel}</text><path d="${SUIT_PATHS[suit]}" fill="${colour}" transform="translate(11 26) scale(.26)"/></svg>`;
      btn.dataset.rank = rank;
      btn.dataset.suit = suit;

      const handler = () => {
        if (!btn.disabled) {
          options.onPick(cardId);
        }
      };
      clickHandlers.set(cardId, handler);
      btn.addEventListener('click', handler);

      cardButtons.set(cardId, btn);
      row.appendChild(btn);
    }
    container.appendChild(row);
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.classList.contains('picker-card')) return;
    const currentRank = target.dataset.rank as Rank | undefined;
    const currentSuit = target.dataset.suit as Suit | undefined;
    if (!currentRank || !currentSuit) return;

    const rankIdx = RANKS.indexOf(currentRank);
    const suitIdx = SUITS.indexOf(currentSuit);
    if (rankIdx < 0 || suitIdx < 0) return;

    let targetRank = currentRank;
    let targetSuit = currentSuit;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetRank = RANKS[(rankIdx + 1) % RANKS.length];
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetRank = RANKS[(rankIdx - 1 + RANKS.length) % RANKS.length];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetSuit = SUITS[(suitIdx + 1) % SUITS.length];
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetSuit = SUITS[(suitIdx - 1 + SUITS.length) % SUITS.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetRank = RANKS[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      targetRank = RANKS[RANKS.length - 1];
    } else {
      return;
    }

    const nextCardId = `${targetRank}${targetSuit}` as CardId;
    const nextBtn = cardButtons.get(nextCardId);
    if (nextBtn && typeof nextBtn.focus === 'function') {
      nextBtn.focus();
    }
  };
  container.addEventListener('keydown', onKeyDown);

  function applyState(usedCards: ReadonlySet<CardId>, pendingRank?: string | null) {
    const normPending = pendingRank ? (pendingRank.toUpperCase() === '0' ? 'T' : pendingRank.toUpperCase()) : null;
    for (const [cardId, btn] of cardButtons.entries()) {
      const isUsed = usedCards.has(cardId);
      btn.disabled = isUsed;
      if (isUsed) {
        btn.classList.add('used');
      } else {
        btn.classList.remove('used');
      }

      const rank = btn.dataset.rank;
      if (normPending && rank === normPending && !isUsed) {
        btn.classList.add('pending-highlight');
      } else {
        btn.classList.remove('pending-highlight');
      }
    }
  }

  applyState(options.usedCards, options.pendingRank);

  return {
    element: container,
    update({ usedCards, pendingRank }) {
      applyState(usedCards, pendingRank);
    },
    destroy() {
      container.removeEventListener('keydown', onKeyDown);
      for (const [cardId, btn] of cardButtons.entries()) {
        const handler = clickHandlers.get(cardId);
        if (handler) {
          btn.removeEventListener('click', handler);
        }
      }
      cardButtons.clear();
      clickHandlers.clear();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }
    },
  };
}
