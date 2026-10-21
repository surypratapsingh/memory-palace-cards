import { cardLabel, deal, isRed, LADDER, score } from '../deck.ts';
import { applyResult, cardFromKeys, drillSeed } from '../drill-logic.ts';
import { imageFor, save } from '../store.ts';
import type { CardId, DrillResult, PalaceView, SaveData } from '../types.ts';
import { createCardPicker, type CardPickerInstance } from './cardPicker.ts';

export function mountDrill(
  root: HTMLElement,
  view: PalaceView,
  initialData: SaveData,
  opts: { level: number; daily: boolean },
  onExit: (data: SaveData, result: DrillResult | null) => void,
): () => void {
  let unmounted = false;
  let currentData = initialData;
  let currentLevel = Math.max(0, Math.min(7, opts.level));
  let isDaily = opts.daily;

  // Track modified loci for cleanup
  const modifiedLoci = new Set<number>();

  // Container inside root
  const overlay = document.createElement('div');
  overlay.className = 'drill-overlay';
  root.appendChild(overlay);

  // Sub-cleanup for current drill phase/round
  let roundCleanup: (() => void) | null = null;

  function clearOverlay(): void {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  function resetPalaceVisuals(): void {
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

  // --- Confirm Dialog on Esc ---
  let isConfirmingQuit = false;
  function showQuitConfirm(onConfirm: () => void): () => void {
    isConfirmingQuit = true;
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'drill-confirm-overlay';

    const box = document.createElement('div');
    box.className = 'drill-confirm-box';

    const h3 = document.createElement('h3');
    h3.className = 'drill-title';
    h3.textContent = 'Quit Drill?';

    const p = document.createElement('p');
    p.className = 'drill-subtitle';
    p.textContent = 'Your drill progress will not be saved.';

    const btnRow = document.createElement('div');
    btnRow.className = 'drill-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'drill-btn';
    cancelBtn.textContent = 'Continue Drill';

    const quitBtn = document.createElement('button');
    quitBtn.type = 'button';
    quitBtn.className = 'drill-btn danger';
    quitBtn.textContent = 'Quit';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(quitBtn);
    box.appendChild(h3);
    box.appendChild(p);
    box.appendChild(btnRow);
    modalOverlay.appendChild(box);
    overlay.appendChild(modalOverlay);

    const closeConfirm = () => {
      isConfirmingQuit = false;
      if (modalOverlay.parentElement) {
        modalOverlay.parentElement.removeChild(modalOverlay.parentElement === overlay ? modalOverlay : modalOverlay);
      }
    };

    cancelBtn.addEventListener('click', closeConfirm);
    quitBtn.addEventListener('click', () => {
      closeConfirm();
      onConfirm();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeConfirm();
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        closeConfirm();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      closeConfirm();
    };
  }

  // --- Start a new drill round ---
  function startRound(level: number, daily: boolean): void {
    if (unmounted) return;
    if (roundCleanup) {
      roundCleanup();
      roundCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();

    const n = LADDER[level];

    // ==========================================
    // Phase 1: READY
    // ==========================================
    function showReady(): void {
      clearOverlay();

      const panel = document.createElement('div');
      panel.className = 'drill-panel drill-modal-center drill-interactive';

      if (daily) {
        const dailyBadge = document.createElement('div');
        dailyBadge.className = 'drill-badge gold';
        dailyBadge.textContent = '★ Daily Deck';
        panel.appendChild(dailyBadge);
      }

      const title = document.createElement('h2');
      title.className = 'drill-title';
      title.textContent = `Level ${level} · ${n} cards`;
      panel.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = 'drill-subtitle';
      subtitle.textContent = 'Press Space or click Start to begin memorizing.';
      panel.appendChild(subtitle);

      const btnRow = document.createElement('div');
      btnRow.className = 'drill-btn-row';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'drill-btn';
      backBtn.textContent = 'Back';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'drill-btn primary';
      startBtn.textContent = 'Start Memorizing';

      btnRow.appendChild(backBtn);
      btnRow.appendChild(startBtn);
      panel.appendChild(btnRow);
      overlay.appendChild(panel);

      const toMemorize = () => {
        window.removeEventListener('keydown', onKeyDown);
        showMemorize();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toMemorize();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onExit(currentData, null);
        }
      };

      window.addEventListener('keydown', onKeyDown);
      startBtn.addEventListener('click', toMemorize);
      backBtn.addEventListener('click', () => onExit(currentData, null));

      roundCleanup = () => {
        window.removeEventListener('keydown', onKeyDown);
        clearOverlay();
      };
    }

    // ==========================================
    // Phase 2: MEMORIZE
    // ==========================================
    function showMemorize(): void {
      clearOverlay();
      const startDate = new Date();
      const seed = drillSeed(daily, startDate);
      const sequence = deal(n, seed);
      const startTime = performance.now();
      const atIso = startDate.toISOString();

      let currentStep = 0;
      let captionsOn = currentData.settings.captions;
      let timerInterval: ReturnType<typeof setInterval> | null = null;
      let quitCleanup: (() => void) | null = null;

      // Top HUD
      const topHud = document.createElement('div');
      topHud.className = 'drill-top-hud';

      const locusCard = document.createElement('div');
      locusCard.className = 'drill-hud-card drill-interactive';

      const locusBadge = document.createElement('div');
      locusBadge.className = 'drill-badge';
      locusBadge.textContent = 'Room';

      const locusTitle = document.createElement('div');
      locusTitle.className = 'drill-locus-title';
      locusTitle.textContent = 'Locus';

      const captionBox = document.createElement('div');
      captionBox.className = 'drill-caption-box';
      captionBox.style.display = 'none';

      locusCard.appendChild(locusBadge);
      locusCard.appendChild(locusTitle);
      locusCard.appendChild(captionBox);
      topHud.appendChild(locusCard);

      const rightHud = document.createElement('div');
      rightHud.className = 'drill-hud-card drill-interactive';
      rightHud.style.display = 'flex';
      rightHud.style.alignItems = 'center';
      rightHud.style.gap = '12px';

      const timerEl = document.createElement('div');
      timerEl.className = 'drill-timer';
      timerEl.textContent = '0:00';

      const captionToggleBtn = document.createElement('button');
      captionToggleBtn.type = 'button';
      captionToggleBtn.className = 'drill-btn';
      captionToggleBtn.textContent = `Captions [H]: ${captionsOn ? 'ON' : 'OFF'}`;

      const quitBtn = document.createElement('button');
      quitBtn.type = 'button';
      quitBtn.className = 'drill-btn danger';
      quitBtn.textContent = 'Quit [Esc]';

      rightHud.appendChild(timerEl);
      rightHud.appendChild(captionToggleBtn);
      rightHud.appendChild(quitBtn);
      topHud.appendChild(rightHud);
      overlay.appendChild(topHud);

      // Bottom HUD
      const bottomHud = document.createElement('div');
      bottomHud.className = 'drill-bottom-hud drill-interactive';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'drill-btn';
      prevBtn.textContent = '← Prev [Left]';

      const stepText = document.createElement('span');
      stepText.style.fontWeight = '700';
      stepText.style.padding = '0 12px';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'drill-btn primary';
      nextBtn.textContent = 'Next [Space] →';

      bottomHud.appendChild(prevBtn);
      bottomHud.appendChild(stepText);
      bottomHud.appendChild(nextBtn);
      overlay.appendChild(bottomHud);

      // Timer update
      timerInterval = setInterval(() => {
        if (unmounted) return;
        const elapsed = performance.now() - startTime;
        timerEl.textContent = formatTime(elapsed);
      }, 200);

      function updateStepView(): void {
        if (unmounted) return;
        const locus = view.loci[currentStep];
        const card = sequence[currentStep];

        locusBadge.textContent = locus?.room ?? '';
        locusTitle.textContent = `Locus ${currentStep + 1} / ${n}: ${locus?.name ?? ''}`;
        stepText.textContent = `${currentStep + 1} / ${n}`;

        prevBtn.disabled = currentStep === 0;
        if (currentStep === n - 1) {
          nextBtn.textContent = 'Done Memorizing [Enter] ✓';
        } else {
          nextBtn.textContent = 'Next [Space] →';
        }

        const captionText = captionsOn ? imageFor(currentData, card) : '';
        if (captionsOn && captionText) {
          captionBox.textContent = captionText;
          captionBox.style.display = 'block';
        } else {
          captionBox.textContent = '';
          captionBox.style.display = 'none';
        }

        view.clearCards();
        view.glideTo(currentStep);
        view.showCard(currentStep, card, {
          caption: captionsOn ? captionText : undefined,
        });
      }

      function nextStep(): void {
        if (currentStep < n - 1) {
          currentStep++;
          updateStepView();
        } else {
          finishMemorize();
        }
      }

      function prevStep(): void {
        if (currentStep > 0) {
          currentStep--;
          updateStepView();
        }
      }

      function toggleCaptions(): void {
        captionsOn = !captionsOn;
        captionToggleBtn.textContent = `Captions [H]: ${captionsOn ? 'ON' : 'OFF'}`;
        updateStepView();
      }

      function finishMemorize(): void {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        window.removeEventListener('keydown', onKeyDown);
        const memorizeMs = Math.round(performance.now() - startTime);
        showRecall(sequence, seed, atIso, memorizeMs);
      }

      function handleQuit(): void {
        if (isConfirmingQuit) return;
        quitCleanup = showQuitConfirm(() => {
          if (timerInterval) clearInterval(timerInterval);
          window.removeEventListener('keydown', onKeyDown);
          onExit(currentData, null);
        });
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (isConfirmingQuit) return;
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          nextStep();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevStep();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentStep === n - 1) {
            finishMemorize();
          } else {
            nextStep();
          }
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          toggleCaptions();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleQuit();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      prevBtn.addEventListener('click', prevStep);
      nextBtn.addEventListener('click', nextStep);
      captionToggleBtn.addEventListener('click', toggleCaptions);
      quitBtn.addEventListener('click', handleQuit);

      updateStepView();

      roundCleanup = () => {
        if (timerInterval) clearInterval(timerInterval);
        if (quitCleanup) quitCleanup();
        window.removeEventListener('keydown', onKeyDown);
        clearOverlay();
      };
    }

    // ==========================================
    // Phase 3: RECALL
    // ==========================================
    function showRecall(sequence: CardId[], seed: string, atIso: string, memorizeMs: number): void {
      clearOverlay();
      view.clearCards();
      view.glideTo(0);

      const recallStartTime = performance.now();
      const answers: (CardId | null)[] = new Array(n).fill(null);
      const usedCards = new Set<CardId>();

      let recallStep = 0;
      let pendingRank: string | null = null;
      let quitCleanup: (() => void) | null = null;

      // Top HUD
      const topHud = document.createElement('div');
      topHud.className = 'drill-top-hud';

      const locusCard = document.createElement('div');
      locusCard.className = 'drill-hud-card drill-interactive';

      const locusBadge = document.createElement('div');
      locusBadge.className = 'drill-badge';
      locusBadge.textContent = 'Room';

      const locusTitle = document.createElement('div');
      locusTitle.className = 'drill-locus-title';
      locusTitle.textContent = 'Recall Locus';

      locusCard.appendChild(locusBadge);
      locusCard.appendChild(locusTitle);
      topHud.appendChild(locusCard);

      const rightHud = document.createElement('div');
      rightHud.className = 'drill-hud-card drill-interactive';
      rightHud.style.display = 'flex';
      rightHud.style.alignItems = 'center';
      rightHud.style.gap = '10px';

      const skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'drill-btn';
      skipBtn.textContent = 'Skip [-]';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'drill-btn';
      backBtn.textContent = 'Back [⌫]';

      const quitBtn = document.createElement('button');
      quitBtn.type = 'button';
      quitBtn.className = 'drill-btn danger';
      quitBtn.textContent = 'Quit [Esc]';

      rightHud.appendChild(skipBtn);
      rightHud.appendChild(backBtn);
      rightHud.appendChild(quitBtn);
      topHud.appendChild(rightHud);
      overlay.appendChild(topHud);

      // Card picker panel at bottom
      const pickerPanel = document.createElement('div');
      pickerPanel.className = 'drill-panel card-picker-panel drill-interactive';

      const promptDiv = document.createElement('div');
      promptDiv.className = 'picker-prompt';

      const promptText = document.createElement('span');
      promptText.textContent = 'Type Rank (A, 2-9, 0, J, Q, K) then Suit (S, H, D, C) or click card:';

      const pendingPill = document.createElement('span');
      pendingPill.className = 'pending-rank-pill';
      pendingPill.textContent = 'Rank: _';

      promptDiv.appendChild(promptText);
      promptDiv.appendChild(pendingPill);
      pickerPanel.appendChild(promptDiv);

      const picker = createCardPicker({
        usedCards,
        pendingRank,
        onPick: (card) => {
          selectCard(card);
        },
      });
      pickerPanel.appendChild(picker.element);
      overlay.appendChild(pickerPanel);

      function updateStepView(): void {
        if (unmounted) return;
        const locus = view.loci[recallStep];
        locusBadge.textContent = locus?.room ?? '';
        locusTitle.textContent = `Locus ${recallStep + 1} of ${n}: ${locus?.name ?? ''}`;

        pendingPill.textContent = pendingRank ? `Rank: ${pendingRank.toUpperCase() === '0' ? '10' : pendingRank.toUpperCase()}` : 'Rank: _';
        picker.update({ usedCards, pendingRank });

        backBtn.disabled = recallStep === 0 && !pendingRank;

        view.glideTo(recallStep);
        const existingAns = answers[recallStep];
        if (existingAns) {
          view.showCard(recallStep, existingAns, { opacity: 0.5 });
        } else {
          view.clearCards();
        }
      }

      function selectCard(card: CardId): void {
        if (usedCards.has(card)) return;

        // If replacing previous answer at this locus
        const prev = answers[recallStep];
        if (prev) {
          usedCards.delete(prev);
        }

        answers[recallStep] = card;
        usedCards.add(card);
        pendingRank = null;

        view.showCard(recallStep, card, { opacity: 0.5 });

        if (recallStep < n - 1) {
          recallStep++;
          updateStepView();
        } else {
          finishRecall();
        }
      }

      function skipCurrent(): void {
        const prev = answers[recallStep];
        if (prev) {
          usedCards.delete(prev);
        }
        answers[recallStep] = null;
        pendingRank = null;
        view.clearCards();

        if (recallStep < n - 1) {
          recallStep++;
          updateStepView();
        } else {
          finishRecall();
        }
      }

      function backStep(): void {
        if (pendingRank) {
          pendingRank = null;
          updateStepView();
          return;
        }
        if (recallStep > 0) {
          recallStep--;
          const prev = answers[recallStep];
          if (prev) {
            usedCards.delete(prev);
            answers[recallStep] = null;
          }
          pendingRank = null;
          updateStepView();
        }
      }

      function handleQuit(): void {
        if (isConfirmingQuit) return;
        quitCleanup = showQuitConfirm(() => {
          window.removeEventListener('keydown', onKeyDown);
          picker.destroy();
          onExit(currentData, null);
        });
      }

      function finishRecall(): void {
        window.removeEventListener('keydown', onKeyDown);
        picker.destroy();
        const recallMs = Math.round(performance.now() - recallStartTime);
        showResults(sequence, answers, seed, atIso, memorizeMs, recallMs);
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (isConfirmingQuit) return;

        if (e.key === 'Escape') {
          e.preventDefault();
          handleQuit();
          return;
        }

        if (e.key === 'Backspace') {
          e.preventDefault();
          backStep();
          return;
        }

        if (e.key === '-') {
          e.preventDefault();
          skipCurrent();
          return;
        }

        // Rank input: A, 2-9, 0, T, J, Q, K
        const key = e.key.toUpperCase();
        if (['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', '0', 'J', 'Q', 'K'].includes(key)) {
          e.preventDefault();
          pendingRank = key === '0' ? 'T' : key;
          updateStepView();
          return;
        }

        // Suit input when pendingRank is active: S, H, D, C
        if (pendingRank && ['S', 'H', 'D', 'C'].includes(key)) {
          e.preventDefault();
          const card = cardFromKeys(pendingRank, key);
          if (card && !usedCards.has(card)) {
            selectCard(card);
          } else {
            pendingRank = null;
            updateStepView();
          }
        }
      };

      window.addEventListener('keydown', onKeyDown);
      skipBtn.addEventListener('click', skipCurrent);
      backBtn.addEventListener('click', backStep);
      quitBtn.addEventListener('click', handleQuit);

      updateStepView();

      roundCleanup = () => {
        if (quitCleanup) quitCleanup();
        window.removeEventListener('keydown', onKeyDown);
        picker.destroy();
        clearOverlay();
      };
    }

    // ==========================================
    // Phase 4: RESULTS
    // ==========================================
    function showResults(
      sequence: CardId[],
      answers: (CardId | null)[],
      seed: string,
      atIso: string,
      memorizeMs: number,
      recallMs: number,
    ): void {
      clearOverlay();

      const result: DrillResult = {
        at: atIso,
        seed,
        daily,
        sequence,
        answers,
        memorizeMs,
        recallMs,
      };

      // Score and highlight weak loci
      const { correct, run, total } = score(sequence, answers);
      for (let i = 0; i < total; i++) {
        const isMiss = answers[i] !== sequence[i];
        if (isMiss) {
          view.setLocusMood(i, 'weak');
          modifiedLoci.add(i);
        } else {
          view.setLocusMood(i, 'normal');
        }
      }

      // Save drill result once
      currentData = applyResult(currentData, result);
      save(currentData);

      // Build Results UI
      const panel = document.createElement('div');
      panel.className = 'drill-panel results-container drill-interactive';

      const title = document.createElement('h2');
      title.className = 'drill-title';
      title.textContent = correct === total ? '★ Perfect Drill!' : 'Drill Results';
      panel.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = 'drill-subtitle';
      subtitle.textContent = `Level ${level} · ${total} cards${daily ? ' · Daily Deck' : ''}`;
      panel.appendChild(subtitle);

      // Summary stats grid
      const statsGrid = document.createElement('div');
      statsGrid.className = 'stats-summary';

      const statItems = [
        { label: 'Accuracy', value: `${correct} / ${total}` },
        { label: 'Run', value: `${run}` },
        { label: 'Memorize', value: formatTime(memorizeMs) },
        { label: 'Recall', value: formatTime(recallMs) },
      ];

      for (const item of statItems) {
        const box = document.createElement('div');
        box.className = 'stat-box';

        const valEl = document.createElement('div');
        valEl.className = 'stat-value';
        valEl.textContent = item.value;

        const lblEl = document.createElement('div');
        lblEl.className = 'stat-label';
        lblEl.textContent = item.label;

        box.appendChild(valEl);
        box.appendChild(lblEl);
        statsGrid.appendChild(box);
      }
      panel.appendChild(statsGrid);

      // Locus table
      const table = document.createElement('table');
      table.className = 'results-table';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const col of ['#', 'Locus', 'Target', 'Recalled', '']) {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let i = 0; i < total; i++) {
        const row = document.createElement('tr');
        const isRight = answers[i] === sequence[i];
        row.className = isRight ? 'correct' : 'miss';

        // Index
        const tdIdx = document.createElement('td');
        tdIdx.textContent = String(i + 1);
        row.appendChild(tdIdx);

        // Name
        const tdName = document.createElement('td');
        tdName.textContent = view.loci[i]?.name ?? `Locus ${i + 1}`;
        row.appendChild(tdName);

        // Target card
        const tdTarget = document.createElement('td');
        const targetTag = document.createElement('span');
        targetTag.className = isRed(sequence[i]) ? 'card-tag red' : 'card-tag';
        targetTag.textContent = cardLabel(sequence[i]);
        tdTarget.appendChild(targetTag);
        row.appendChild(tdTarget);

        // Answer
        const tdAns = document.createElement('td');
        const ans = answers[i];
        if (ans) {
          const ansTag = document.createElement('span');
          ansTag.className = isRed(ans) ? 'card-tag red' : 'card-tag';
          ansTag.textContent = cardLabel(ans);
          tdAns.appendChild(ansTag);
        } else {
          tdAns.textContent = '— (skipped)';
          tdAns.style.color = 'var(--muted, #94a3b8)';
        }
        row.appendChild(tdAns);

        // Status check/cross
        const tdStatus = document.createElement('td');
        tdStatus.className = isRight ? 'status-check' : 'status-cross';
        tdStatus.textContent = isRight ? '✓' : '✗';
        row.appendChild(tdStatus);

        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      panel.appendChild(table);

      // Action buttons
      const btnRow = document.createElement('div');
      btnRow.className = 'drill-btn-row';

      const exitBtn = document.createElement('button');
      exitBtn.type = 'button';
      exitBtn.className = 'drill-btn';
      exitBtn.textContent = 'Back to Palace [Esc]';

      const againBtn = document.createElement('button');
      againBtn.type = 'button';
      againBtn.className = 'drill-btn primary';
      againBtn.textContent = 'Play Again [Space]';

      btnRow.appendChild(exitBtn);
      btnRow.appendChild(againBtn);
      panel.appendChild(btnRow);
      overlay.appendChild(panel);

      const doAgain = () => {
        window.removeEventListener('keydown', onKeyDown);
        // Start again with same level, fresh seed, without re-saving
        startRound(currentLevel, false);
      };

      const doExit = () => {
        window.removeEventListener('keydown', onKeyDown);
        resetPalaceVisuals();
        onExit(currentData, result);
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          doAgain();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          doExit();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      againBtn.addEventListener('click', doAgain);
      exitBtn.addEventListener('click', doExit);

      roundCleanup = () => {
        window.removeEventListener('keydown', onKeyDown);
        clearOverlay();
      };
    }

    // Start with Ready phase
    showReady();
  }

  // Launch initial round
  startRound(currentLevel, isDaily);

  // Return unmount function
  return () => {
    unmounted = true;
    if (roundCleanup) {
      roundCleanup();
      roundCleanup = null;
    }
    resetPalaceVisuals();
    clearOverlay();
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  };
}
