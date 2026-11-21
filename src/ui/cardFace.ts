import { cardSvg, cardName } from './cardArt.ts';
import type { CardId } from '../types.ts';

/** Playing-card face as an accessible, authored SVG inside its existing trainer element. */
export function cardFace(id: CardId): HTMLElement {
  const el = document.createElement('div');
  const red = id.endsWith('H') || id.endsWith('D');
  el.className = red ? 'card-face red' : 'card-face';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', cardName(id));
  const theme = document.documentElement.classList.contains('color-safe') ? 'four-colour' : 'classic';
  el.innerHTML = cardSvg(id, { theme, width: 100 });
  return el;
}
