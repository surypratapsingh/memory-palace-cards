import { LOCI } from '../data/palace.ts';
import { cardLabel, deal, localDay, score } from '../deck.ts';
import { applyResult, cardFromKeys, drillSeed } from '../drill-logic.ts';
import { updateStreak } from '../progress.ts';
import { ambience, play, stopAll } from '../sound.ts';
import { imageFor, save } from '../store.ts';
import type { CardId, DrillResult, PalaceView, SaveData } from '../types.ts';
import { createCardPicker, type CardPickerInstance } from './cardPicker.ts';

export function mountOnboarding(
  root: HTMLElement,
  view: PalaceView,
  initialData: SaveData,
  onComplete: (data: SaveData, result: DrillResult) => void,
  onSkip: () => void,
): () => void {
  let unmounted = false;
  let currentData = initialData;
  // Set once an attempt is saved; leaving mid-retry must hand that save back, not skip it.
  let lastResult: DrillResult | null = null;
  const leave = () => {
    stopAll();
    return lastResult ? onComplete(currentData, lastResult) : onSkip();
  };
  const modifiedLoci = new Set<number>();

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  root.appendChild(overlay);

  let currentPhaseCleanup: (() => void) | null = null;
  let currentGlideToken = 0;

  function safeGlideTo(locusIndex: number): Promise<void> {
    const token = ++currentGlideToken;
    const p = view.glideTo(locusIndex);
    if (p && typeof p.then === 'function') {
      return p.then(() => {
        if (unmounted || token !== currentGlideToken) return;
      }).catch(() => {});
    }
    return Promise.resolve();
  }

  function clearOverlay(): void {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  function resetPalaceVisuals(): void {
    currentGlideToken++;
    view.clearCards();
    for (const idx of modifiedLoci) {
      view.setLocusMood(idx, 'normal');
    }
    modifiedLoci.clear();
  }

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // --- Step 1: Introduction ---
  function showStep1(): void {
    if (unmounted) return;
    if (currentPhaseCleanup) {
      currentPhaseCleanup();
      currentPhaseCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();

    view.setFreeWalk(false);
    safeGlideTo(0);
    ambience(LOCI[0].room, currentData.settings.sound);

    const panel = document.createElement('div');
    panel.className = 'onboarding-panel onboarding-modal-center';

    const title = document.createElement('h2');
    title.className = 'onboarding-title';
    title.textContent = 'This is your memory palace. Watch three cards.';
    panel.appendChild(title);

    const btnRow = document.createElement('div');
    btnRow.className = 'onboarding-btn-row';

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'onboarding-btn primary';
    startBtn.textContent = 'Watch three cards';

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'onboarding-skip-link';
    skipBtn.textContent = 'I know the method';

    btnRow.appendChild(startBtn);
    btnRow.appendChild(skipBtn);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);

    const startAction = () => {
      window.removeEventListener('keydown', onKeyDown);
      showStep2();
    };

    const skipAction = () => {
      window.removeEventListener('keydown', onKeyDown);
      stopAll();
      onSkip();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skipAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', startAction);
    skipBtn.addEventListener('click', skipAction);

    currentPhaseCleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      startBtn.removeEventListener('click', startAction);
      skipBtn.removeEventListener('click', skipAction);
      clearOverlay();
    };
  }

  // --- Step 2: Guided Memorize (3 cards) ---
  function showStep2(): void {
    if (unmounted) return;
    if (currentPhaseCleanup) {
      currentPhaseCleanup();
      currentPhaseCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();

    const startDate = new Date();
    const seed = drillSeed(false, startDate);
    const sequence = deal(3, seed);
    const startTime = performance.now();
    let currentIndex = 0;

    function renderMemorizeCard(idx: number): void {
      if (unmounted) return;
      clearOverlay();
      safeGlideTo(idx);
      ambience(LOCI[idx].room, currentData.settings.sound);
      play('flip', currentData.settings.sound);

      const card = sequence[idx];
      const caption = imageFor(currentData, card);
      view.showCard(idx, card, { caption });

      const locus = view.loci[idx];

      // Top HUD
      const topHud = document.createElement('div');
      topHud.className = 'onboarding-top-hud';

      const hudCard = document.createElement('div');
      hudCard.className = 'onboarding-hud-card';
      hudCard.dataset.card = card;

      const badge = document.createElement('div');
      badge.className = 'onboarding-badge';
      badge.textContent = locus?.room ?? 'Palace';

      const locusTitle = document.createElement('div');
      locusTitle.className = 'onboarding-locus-title';
      locusTitle.textContent = `Locus ${idx + 1} of 3: ${locus?.name ?? ''} — ${cardLabel(card)}`;

      const captionText = document.createElement('div');
      captionText.className = 'onboarding-caption-text';
      captionText.textContent = `Image: "${caption}"`;

      hudCard.appendChild(badge);
      hudCard.appendChild(locusTitle);
      hudCard.appendChild(captionText);
      topHud.appendChild(hudCard);
      overlay.appendChild(topHud);

      // Center instruction banner
      const banner = document.createElement('div');
      banner.className = 'onboarding-instruction-banner';
      if (idx === 0) {
        banner.textContent = 'See the image AT the object. Make it big and strange.';
      } else {
        banner.textContent = `Picture "${caption}" placed directly at the ${locus?.name ?? 'object'}.`;
      }
      overlay.appendChild(banner);

      // Bottom HUD
      const bottomHud = document.createElement('div');
      bottomHud.className = 'onboarding-bottom-hud';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'onboarding-btn primary';
      nextBtn.textContent = idx === 2 ? 'Test Recall [Space] →' : 'Next [Space] →';

      bottomHud.appendChild(nextBtn);
      overlay.appendChild(bottomHud);

      const nextAction = () => {
        if (currentIndex < 2) {
          currentIndex++;
          renderMemorizeCard(currentIndex);
        } else {
          const memorizeMs = Math.round(performance.now() - startTime);
          showStep3(sequence, seed, startDate, memorizeMs);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          window.removeEventListener('keydown', onKeyDown);
          nextAction();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          window.removeEventListener('keydown', onKeyDown);
          leave();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      nextBtn.addEventListener('click', () => {
        window.removeEventListener('keydown', onKeyDown);
        nextAction();
      });

      currentPhaseCleanup = () => {
        window.removeEventListener('keydown', onKeyDown);
        clearOverlay();
      };
    }

    renderMemorizeCard(0);
  }

  // --- Step 3: Recall (3 cards) ---
  function showStep3(
    sequence: CardId[],
    seed: string,
    startDate: Date,
    memorizeMs: number,
  ): void {
    if (unmounted) return;
    if (currentPhaseCleanup) {
      currentPhaseCleanup();
      currentPhaseCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();

    const recallStartTime = performance.now();
    const answers: (CardId | null)[] = [null, null, null];
    const usedCards = new Set<CardId>();
    let recallIndex = 0;
    let pendingRank: string | null = null;
    let picker: CardPickerInstance | null = null;

    // Top HUD
    const topHud = document.createElement('div');
    topHud.className = 'onboarding-top-hud';

    const hudCard = document.createElement('div');
    hudCard.className = 'onboarding-hud-card';

    const badge = document.createElement('div');
    badge.className = 'onboarding-badge';
    badge.textContent = 'Palace';

    const locusTitle = document.createElement('div');
    locusTitle.className = 'onboarding-locus-title';
    locusTitle.textContent = 'Recall Locus 1 of 3';

    hudCard.appendChild(badge);
    hudCard.appendChild(locusTitle);
    topHud.appendChild(hudCard);
    overlay.appendChild(topHud);

    // Card Picker Panel
    const pickerPanel = document.createElement('div');
    pickerPanel.className = 'onboarding-picker-panel';

    const promptText = document.createElement('div');
    promptText.className = 'onboarding-caption-text';
    promptText.textContent = 'Recall: walk the route in your mind, the cards are still there.';

    const pendingPill = document.createElement('div');
    pendingPill.style.fontSize = '0.9rem';
    pendingPill.style.fontWeight = '600';
    pendingPill.style.color = 'var(--text, #f8fafc)';
    pendingPill.textContent = 'Type Rank (A, 2-9, 0, J, Q, K) then Suit (S, H, D, C) or click card:';

    pickerPanel.appendChild(promptText);
    pickerPanel.appendChild(pendingPill);

    function selectCard(card: CardId): void {
      if (usedCards.has(card) || recallIndex >= 3) return;
      answers[recallIndex] = card;
      usedCards.add(card);
      pendingRank = null;
      recallIndex++;

      if (recallIndex < 3) {
        updateRecallStep();
      } else {
        const recallMs = Math.round(performance.now() - recallStartTime);
        if (currentPhaseCleanup) {
          currentPhaseCleanup();
          currentPhaseCleanup = null;
        }
        showStep4(sequence, answers, seed, startDate, memorizeMs, recallMs);
      }
    }

    picker = createCardPicker({
      usedCards,
      pendingRank,
      onPick: selectCard,
    });
    pickerPanel.appendChild(picker.element);
    overlay.appendChild(pickerPanel);

    function updateRecallStep(): void {
      if (unmounted) return;
      safeGlideTo(recallIndex);
      const roomLocus = LOCI[recallIndex];
      if (roomLocus) {
        ambience(roomLocus.room, currentData.settings.sound);
      }
      const locus = view.loci[recallIndex];
      badge.textContent = locus?.room ?? 'Palace';
      locusTitle.textContent = `Recall Locus ${recallIndex + 1} of 3: ${locus?.name ?? ''}`;
      pendingPill.textContent = pendingRank
        ? `Rank selected: ${pendingRank}. Now type suit (S, H, D, C) or click:`
        : 'Type Rank (A, 2-9, 0, J, Q, K) then Suit (S, H, D, C) or click card:';
      picker?.update({ usedCards, pendingRank });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (currentPhaseCleanup) {
          currentPhaseCleanup();
          currentPhaseCleanup = null;
        }
        leave();
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', '0', 'J', 'Q', 'K'].includes(key)) {
        e.preventDefault();
        pendingRank = key === '0' ? 'T' : key;
        updateRecallStep();
        return;
      }

      if (pendingRank && ['S', 'H', 'D', 'C'].includes(key)) {
        e.preventDefault();
        const card = cardFromKeys(pendingRank, key);
        if (card && !usedCards.has(card)) {
          selectCard(card);
        } else {
          pendingRank = null;
          updateRecallStep();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    updateRecallStep();

    currentPhaseCleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      picker?.destroy();
      clearOverlay();
    };
  }

  // --- Step 4: Result ---
  function showStep4(
    sequence: CardId[],
    answers: (CardId | null)[],
    seed: string,
    startDate: Date,
    memorizeMs: number,
    recallMs: number,
  ): void {
    if (unmounted) return;
    if (currentPhaseCleanup) {
      currentPhaseCleanup();
      currentPhaseCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();

    const { correct, total } = score(sequence, answers);
    play(correct === total ? 'correct' : 'wrong', currentData.settings.sound);
    for (let i = 0; i < total; i++) {
      const isRight = answers[i] === sequence[i];
      view.setLocusMood(i, isRight ? 'normal' : 'weak');
      modifiedLoci.add(i);
    }

    const result: DrillResult = {
      at: startDate.toISOString(),
      seed,
      daily: false,
      sequence,
      answers,
      memorizeMs,
      recallMs,
    };
    currentData = applyResult(currentData, result);
    currentData.streak = updateStreak(currentData.streak, localDay(startDate));
    save(currentData);
    lastResult = result;

    const panel = document.createElement('div');
    panel.className = 'onboarding-panel onboarding-modal-center';

    // Only a perfect run "proves" the method; otherwise the main action is a fresh 3-card try.
    const perfect = correct === total;
    const title = document.createElement('h2');
    title.className = 'onboarding-title';
    title.textContent = perfect ? '★ Proved!' : 'Almost there';
    panel.appendChild(title);

    const resultLine = document.createElement('p');
    resultLine.className = 'onboarding-result-line';
    resultLine.textContent = `You remembered ${correct} of ${total} in order. ` +
      (perfect ? 'Memory champions use exactly this.' : 'Try three new cards: see each image AT its object, big and strange.');
    panel.appendChild(resultLine);

    const statsRow = document.createElement('div');
    statsRow.className = 'onboarding-stats-row';

    const accStat = document.createElement('span');
    accStat.textContent = `Accuracy: ${correct} / ${total}`;

    const memStat = document.createElement('span');
    memStat.textContent = `Memorize: ${formatTime(memorizeMs)}`;

    const recStat = document.createElement('span');
    recStat.textContent = `Recall: ${formatTime(recallMs)}`;

    statsRow.appendChild(accStat);
    statsRow.appendChild(memStat);
    statsRow.appendChild(recStat);
    panel.appendChild(statsRow);

    const btnRow = document.createElement('div');
    btnRow.className = 'onboarding-btn-row';

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'onboarding-btn primary';
    retryBtn.textContent = 'Try again';

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = perfect ? 'onboarding-btn primary' : 'onboarding-skip-link';
    continueBtn.textContent = 'Continue';

    if (!perfect) btnRow.appendChild(retryBtn);
    btnRow.appendChild(continueBtn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);

    const finishAction = () => {
      if (currentPhaseCleanup) {
        currentPhaseCleanup();
        currentPhaseCleanup = null;
      }
      stopAll();
      onComplete(currentData, result);
    };

    // This attempt is already saved like any drill; a retry deals three new cards.
    const retryAction = () => showStep2();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (perfect) finishAction();
        else retryAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    continueBtn.addEventListener('click', finishAction);
    retryBtn.addEventListener('click', retryAction);

    currentPhaseCleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      continueBtn.removeEventListener('click', finishAction);
      retryBtn.removeEventListener('click', retryAction);
      clearOverlay();
    };
  }

  showStep1();

  return () => {
    unmounted = true;
    stopAll();
    if (currentPhaseCleanup) {
      currentPhaseCleanup();
      currentPhaseCleanup = null;
    }
    resetPalaceVisuals();
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  };
}
