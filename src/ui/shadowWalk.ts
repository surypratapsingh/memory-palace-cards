import { cardLabel } from '../deck.ts';
import { imageFor } from '../store.ts';
import type { CardId, PalaceView, SaveData } from '../types.ts';

export function mountShadowWalk(
  root: HTMLElement,
  view: PalaceView,
  data: SaveData,
  onExit: () => void,
): () => void {
  let active = true;
  let revealTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingLocus: number | null = null;
  let revealedLocus: number | null = null;

  root.textContent = '';

  // Free walk with cards hidden
  view.setFreeWalk(true);
  view.clearCards();

  // Find latest drill
  const drills = data.drills;
  let latestDrill = drills.length > 0 ? drills[drills.length - 1] : undefined;
  let latestTime = -Infinity;
  for (const drill of drills) {
    const t = new Date(drill.at).getTime();
    if (Number.isFinite(t) && t > latestTime) {
      latestTime = t;
      latestDrill = drill;
    }
  }

  const cardsByLocus = new Map<number, CardId>();
  if (latestDrill) {
    for (let i = 0; i < latestDrill.sequence.length; i++) {
      cardsByLocus.set(i, latestDrill.sequence[i]);
    }
  }

  // Create UI overlay
  const overlay = document.createElement('div');
  overlay.className = 'shadow-walk-overlay';

  // Top header HUD
  const topHud = document.createElement('div');
  topHud.className = 'shadow-walk-top-hud';

  const titlePill = document.createElement('div');
  titlePill.className = 'shadow-walk-title-pill';
  titlePill.textContent = 'Shadow Walk';
  topHud.appendChild(titlePill);

  const instructions = document.createElement('div');
  instructions.className = 'shadow-walk-instructions';
  instructions.textContent = 'WASD to walk · Mouse to look · Click a locus to test · Esc to exit';
  topHud.appendChild(instructions);

  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'shadow-walk-exit-btn';
  exitBtn.textContent = 'Exit [Esc]';
  topHud.appendChild(exitBtn);

  overlay.appendChild(topHud);

  // Center / bottom prompt panel
  const promptPanel = document.createElement('div');
  promptPanel.className = 'shadow-walk-prompt-panel';
  promptPanel.style.display = 'none';

  const promptTitle = document.createElement('div');
  promptTitle.className = 'shadow-walk-prompt-title';
  promptPanel.appendChild(promptTitle);

  const promptSubtitle = document.createElement('div');
  promptSubtitle.className = 'shadow-walk-prompt-subtitle';
  promptPanel.appendChild(promptSubtitle);

  overlay.appendChild(promptPanel);
  root.appendChild(overlay);

  function clearPendingReveal(): void {
    if (revealTimeout !== null) {
      clearTimeout(revealTimeout);
      revealTimeout = null;
    }
    if (revealedLocus !== null) {
      view.showCard(revealedLocus, null);
      revealedLocus = null;
    }
  }

  function showPrompt(index: number): void {
    clearPendingReveal();
    pendingLocus = index;
    const locusName = view.loci[index]?.name ?? `Locus ${index + 1}`;
    promptTitle.textContent = 'What stood here?';
    promptSubtitle.textContent = `Locus ${index + 1} (${locusName}) · Click again or press Space to reveal`;
    promptPanel.style.display = 'flex';
  }

  function revealCard(index: number): void {
    clearPendingReveal();
    const card = cardsByLocus.get(index);
    if (!card) return;

    revealedLocus = index;
    pendingLocus = null;
    const caption = imageFor(data, card);
    view.showCard(index, card, { caption });

    const locusName = view.loci[index]?.name ?? `Locus ${index + 1}`;
    promptTitle.textContent = `${cardLabel(card)}: ${caption}`;
    promptSubtitle.textContent = `Locus ${index + 1} (${locusName}) · Revealing for 3 seconds`;
    promptPanel.style.display = 'flex';

    revealTimeout = setTimeout(() => {
      if (!active) return;
      if (revealedLocus === index) {
        view.showCard(index, null);
        revealedLocus = null;
      }
      promptPanel.style.display = 'none';
      revealTimeout = null;
    }, 3000);
  }

  function handleLocusClick(index: number): void {
    if (!active) return;
    if (cardsByLocus.has(index)) {
      if (pendingLocus === index) {
        revealCard(index);
      } else {
        showPrompt(index);
      }
    } else {
      clearPendingReveal();
      pendingLocus = null;
      promptPanel.style.display = 'none';
    }
  }

  view.onLocusClick(handleLocusClick);

  function leave(): void {
    if (!active) return;
    active = false;
    clearPendingReveal();
    view.setFreeWalk(false);
    view.clearCards();
    onExit();
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      leave();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      if (pendingLocus !== null && cardsByLocus.has(pendingLocus)) {
        e.preventDefault();
        revealCard(pendingLocus);
      }
    }
  };

  window.addEventListener('keydown', onKeyDown);
  exitBtn.addEventListener('click', leave);

  return () => {
    active = false;
    window.removeEventListener('keydown', onKeyDown);
    exitBtn.removeEventListener('click', leave);
    clearPendingReveal();
    view.setFreeWalk(false);
    view.clearCards();
    root.textContent = '';
  };
}
