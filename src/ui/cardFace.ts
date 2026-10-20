import { cardLabel, isRed } from '../deck.ts';
import type { CardId } from '../types.ts';

/** Playing-card face as a DOM element. Styled by .card-face in style.css. */
export function cardFace(id: CardId): HTMLElement {
  const el = document.createElement('div');
  el.className = isRed(id) ? 'card-face red' : 'card-face';
  el.textContent = cardLabel(id);
  return el;
}
