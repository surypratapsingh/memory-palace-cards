import type { PalaceView, SaveData } from '../types.ts';
import {
  dailyDrillOn,
  unlockedLevel,
  recommendedLevel,
  personalBests,
  rankTitle,
  shareText,
} from '../progress.ts';
import { ghosts, leeches } from '../living.ts';
import { isDue, strength } from '../srs.ts';
import { DECK, LADDER, cardLabel, localDay, score } from '../deck.ts';
import { exportJson, importJson } from '../store.ts';
import { sparklinePath } from './sparkline.ts';
import './home.css';

export interface HomeActions {
  train(): void;
  drill(level: number, daily: boolean): void;
  settings(): void;
  shadowWalk?(): void;
  replaceSave(next: SaveData): void;
}

/**
 * Format milliseconds into M:SS or S.s
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function mountHome(
  root: HTMLElement,
  data: SaveData,
  actions: HomeActions,
  view?: PalaceView,
): () => void {
  const activeUrls: string[] = [];
  const listeners: Array<{ target: EventTarget; type: string; handler: EventListenerOrEventListenerObject }> = [];

  function addEvent<T extends EventTarget>(target: T, type: string, handler: EventListenerOrEventListenerObject): void {
    target.addEventListener(type, handler);
    listeners.push({ target, type, handler });
  }

  // Render ghosts and refresh once a minute
  let ghostInterval: ReturnType<typeof setInterval> | null = null;
  if (view) {
    const renderGhosts = () => {
      view.clearCards();
      const ghostList = ghosts(data.drills, new Date());
      for (const g of ghostList) {
        view.showCard(g.index, g.card, { opacity: g.opacity });
      }
    };
    renderGhosts();
    ghostInterval = setInterval(renderGhosts, 60000);
  }

  // Clear root safely
  root.textContent = '';

  const container = document.createElement('div');
  container.className = 'home-container';

  const panel = document.createElement('div');
  panel.className = 'home-panel';
  container.appendChild(panel);

  // 1. Header: Rank title, streak, settings button
  const header = document.createElement('header');
  header.className = 'home-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'home-header-left';

  const appTitle = document.createElement('h1');
  appTitle.className = 'home-title';
  appTitle.textContent = 'Memory Palace';
  headerLeft.appendChild(appTitle);

  const bests = personalBests(data.drills);
  const perfectLevels = Object.keys(bests).map(Number);
  const bestLevel = perfectLevels.length > 0 ? Math.max(...perfectLevels) : -1;
  const rank = rankTitle(bestLevel);

  const rankBadge = document.createElement('div');
  rankBadge.className = 'home-rank-badge';
  rankBadge.textContent = `★ ${rank}`;
  headerLeft.appendChild(rankBadge);

  header.appendChild(headerLeft);

  const headerRight = document.createElement('div');
  headerRight.className = 'home-header-right';

  const streakPill = document.createElement('div');
  streakPill.className = 'home-streak-pill';
  streakPill.textContent = `🔥 ${data.streak.count} · ❄️ ${data.streak.freezes}`;
  headerRight.appendChild(streakPill);

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'home-settings-btn';
  settingsBtn.textContent = '⚙️ Settings';
  addEvent(settingsBtn, 'click', () => actions.settings());
  headerRight.appendChild(settingsBtn);

  header.appendChild(headerRight);
  panel.appendChild(header);

  // 2. First Run check (no drills and no srs)
  const isFirstRun = data.drills.length === 0 && Object.keys(data.srs).length === 0;

  if (isFirstRun) {
    const heroCard = document.createElement('section');
    heroCard.className = 'first-run-hero';

    const heroTitle = document.createElement('h2');
    heroTitle.className = 'first-run-title';
    heroTitle.textContent = 'Memorize 3 cards in 60 seconds';
    heroCard.appendChild(heroTitle);

    const heroDesc = document.createElement('p');
    heroDesc.className = 'first-run-desc';
    heroDesc.textContent =
      'Begin your journey through the palace. Place 3 cards on loci along your route, then recall them in order.';
    heroCard.appendChild(heroDesc);

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'first-run-cta';
    startBtn.textContent = 'Start First Drill';
    addEvent(startBtn, 'click', () => actions.drill(0, false));
    heroCard.appendChild(startBtn);

    const learnLink = document.createElement('button');
    learnLink.type = 'button';
    learnLink.className = 'first-run-link';
    learnLink.textContent = 'Learn card images';
    addEvent(learnLink, 'click', () => actions.train());
    heroCard.appendChild(learnLink);

    panel.appendChild(heroCard);
  } else {
    // Normal dashboard grid for sections 3-8
    const grid = document.createElement('div');
    grid.className = 'home-grid';

    // 3. Today: Daily Deck
    const todayCard = document.createElement('section');
    todayCard.className = 'home-card';

    const todayHeader = document.createElement('div');
    todayHeader.className = 'home-card-header';
    const todayTitle = document.createElement('h2');
    todayTitle.className = 'home-card-title';
    todayTitle.textContent = 'Today';
    todayHeader.appendChild(todayTitle);
    todayCard.appendChild(todayHeader);

    const today = localDay();
    const todayDaily = dailyDrillOn(data.drills, today);

    const unlocked = unlockedLevel(data.drills);
    const dailyBtn = document.createElement('button');
    dailyBtn.type = 'button';
    dailyBtn.className = 'home-btn-primary';
    dailyBtn.textContent = todayDaily ? 'Replay Daily Deck' : 'Daily Deck';
    addEvent(dailyBtn, 'click', () => actions.drill(unlocked, true));
    todayCard.appendChild(dailyBtn);

    if (todayDaily) {
      const shareBox = document.createElement('pre');
      shareBox.className = 'share-preview-box';
      const shareContent = shareText(todayDaily);
      shareBox.textContent = shareContent;
      todayCard.appendChild(shareBox);

      const shareActions = document.createElement('div');
      shareActions.className = 'share-action-row';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'home-btn-secondary';
      copyBtn.textContent = 'Copy Result';
      addEvent(copyBtn, 'click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareContent).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy Result';
            }, 2000);
          });
        }
      });
      shareActions.appendChild(copyBtn);
      todayCard.appendChild(shareActions);
    }

    grid.appendChild(todayCard);

    // 4. Practice: 70% zone
    const practiceCard = document.createElement('section');
    practiceCard.className = 'home-card';

    const practiceHeader = document.createElement('div');
    practiceHeader.className = 'home-card-header';
    const practiceTitle = document.createElement('h2');
    practiceTitle.className = 'home-card-title';
    practiceTitle.textContent = 'Practice';
    practiceHeader.appendChild(practiceTitle);
    practiceCard.appendChild(practiceHeader);

    const recLevel = recommendedLevel(data.drills);
    const cardCount = LADDER[recLevel];

    const practiceBtn = document.createElement('button');
    practiceBtn.type = 'button';
    practiceBtn.className = 'home-btn-primary';
    practiceBtn.textContent = 'Practice';
    addEvent(practiceBtn, 'click', () => actions.drill(recLevel, false));
    practiceCard.appendChild(practiceBtn);

    const practiceSubtitle = document.createElement('div');
    practiceSubtitle.className = 'home-card-subtitle';
    practiceSubtitle.textContent = `Level ${recLevel} · ${cardCount} cards · your 70% zone`;
    practiceCard.appendChild(practiceSubtitle);

    if (data.drills.length > 0 && actions.shadowWalk) {
      const shadowBtn = document.createElement('button');
      shadowBtn.type = 'button';
      shadowBtn.className = 'home-btn-secondary home-shadow-btn';
      shadowBtn.textContent = 'Shadow Walk';
      addEvent(shadowBtn, 'click', () => actions.shadowWalk?.());
      practiceCard.appendChild(shadowBtn);
    }

    grid.appendChild(practiceCard);

    // 5. Card images: due count, new count, mini grid, train button
    const cardImagesCard = document.createElement('section');
    cardImagesCard.className = 'home-card';

    const cardImagesHeader = document.createElement('div');
    cardImagesHeader.className = 'home-card-header';
    const cardImagesTitle = document.createElement('h2');
    cardImagesTitle.className = 'home-card-title';
    cardImagesTitle.textContent = 'Card Images';
    cardImagesHeader.appendChild(cardImagesTitle);

    let dueCount = 0;
    let newCount = 0;
    for (const card of DECK) {
      const s = data.srs[card];
      if (!s) newCount++;
      else if (isDue(s)) dueCount++;
    }

    const cardImagesStats = document.createElement('div');
    cardImagesStats.className = 'home-card-subtitle';
    cardImagesStats.textContent = `${dueCount} due · ${newCount} new`;
    cardImagesHeader.appendChild(cardImagesStats);
    cardImagesCard.appendChild(cardImagesHeader);

    const miniGridContainer = document.createElement('div');
    miniGridContainer.className = 'mini-grid-container';

    const miniGrid = document.createElement('div');
    miniGrid.className = 'mini-grid';

    for (const card of DECK) {
      const s = data.srs[card];
      const st = s ? strength(s) : 'new';
      const tile = document.createElement('div');
      tile.className = 'mini-tile';
      tile.setAttribute('data-strength', st);
      tile.style.background = 'var(--s)';
      tile.setAttribute('title', `${cardLabel(card)}: ${st}`);
      tile.setAttribute('aria-label', `${cardLabel(card)}: ${st}`);
      tile.textContent = cardLabel(card);
      miniGrid.appendChild(tile);
    }
    miniGridContainer.appendChild(miniGrid);
    cardImagesCard.appendChild(miniGridContainer);

    const slipping = leeches(data.srs);
    if (slipping.length > 0) {
      const leechesNotice = document.createElement('div');
      leechesNotice.className = 'home-leeches-notice';
      const count = slipping.length;
      leechesNotice.textContent = `${count} ${count === 1 ? 'image keeps' : 'images keep'} slipping`;
      cardImagesCard.appendChild(leechesNotice);
    }

    const trainBtn = document.createElement('button');
    trainBtn.type = 'button';
    trainBtn.className = 'home-btn-secondary';
    trainBtn.textContent = 'Train Images';
    addEvent(trainBtn, 'click', () => actions.train());
    cardImagesCard.appendChild(trainBtn);

    grid.appendChild(cardImagesCard);

    // 7. Progress: Sparkline of last 20 drills accuracy
    const progressCard = document.createElement('section');
    progressCard.className = 'home-card';

    const progressHeader = document.createElement('div');
    progressHeader.className = 'home-card-header';
    const progressTitle = document.createElement('h2');
    progressTitle.className = 'home-card-title';
    progressTitle.textContent = 'Progress';
    progressHeader.appendChild(progressTitle);
    progressCard.appendChild(progressHeader);

    const last20 = data.drills.slice(-20);
    const accuracies = last20.map((d) => {
      const sc = score(d.sequence, d.answers);
      return sc.total > 0 ? sc.correct / sc.total : 0;
    });

    const sparkBox = document.createElement('div');
    sparkBox.className = 'sparkline-box';

    const svgW = 280;
    const svgH = 64;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('width', String(svgW));
    svg.setAttribute('height', String(svgH));
    svg.setAttribute('class', 'sparkline-svg');

    const pathData = sparklinePath(accuracies, svgW, svgH);
    if (pathData) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'var(--accent)');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
    }
    sparkBox.appendChild(svg);

    const sparkStats = document.createElement('div');
    sparkStats.className = 'sparkline-stats';
    const latestAcc = accuracies.length > 0 ? (accuracies[accuracies.length - 1] * 100).toFixed(0) : '0';
    sparkStats.textContent = `Accuracy (last ${last20.length} drills): ${latestAcc}%`;
    sparkBox.appendChild(sparkStats);

    progressCard.appendChild(sparkBox);
    grid.appendChild(progressCard);

    // 6. Ladder: 8 levels
    const ladderSection = document.createElement('section');
    ladderSection.className = 'home-card ladder-section';

    const ladderHeader = document.createElement('div');
    ladderHeader.className = 'home-card-header';
    const ladderTitle = document.createElement('h2');
    ladderTitle.className = 'home-card-title';
    ladderTitle.textContent = 'Difficulty Ladder';
    ladderHeader.appendChild(ladderTitle);

    const unlockNote = document.createElement('div');
    unlockNote.className = 'ladder-unlock-note';
    if (unlocked < LADDER.length - 1) {
      unlockNote.textContent = `Next: perfect ${LADDER[unlocked]} cards to unlock ${LADDER[unlocked + 1]}`;
    } else {
      unlockNote.textContent = 'All levels unlocked';
    }
    ladderHeader.appendChild(unlockNote);
    ladderSection.appendChild(ladderHeader);

    const ladderList = document.createElement('div');
    ladderList.className = 'ladder-list';

    for (let i = 0; i < LADDER.length; i++) {
      const cards = LADDER[i];
      const isUnlocked = i <= unlocked;
      const best = bests[i];

      const item = document.createElement('div');
      item.className = `ladder-item ${isUnlocked ? 'unlocked' : 'locked'}`;

      const itemHeader = document.createElement('div');
      itemHeader.className = 'ladder-item-header';

      const itemTitle = document.createElement('span');
      itemTitle.textContent = `Level ${i} (${cards} cards)`;
      itemHeader.appendChild(itemTitle);

      if (!isUnlocked) {
        const lockIcon = document.createElement('span');
        lockIcon.textContent = '🔒';
        lockIcon.setAttribute('title', 'Locked');
        itemHeader.appendChild(lockIcon);
      }
      item.appendChild(itemHeader);

      const bestText = document.createElement('div');
      bestText.className = 'ladder-item-best';
      if (best) {
        bestText.textContent = `Best: ${formatDuration(best.memorizeMs)}`;
      } else {
        bestText.textContent = isUnlocked ? 'No perfect run' : 'Locked';
      }
      item.appendChild(bestText);

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'home-btn-secondary';
      playBtn.textContent = isUnlocked ? 'Play' : 'Locked';
      playBtn.disabled = !isUnlocked;
      if (isUnlocked) {
        addEvent(playBtn, 'click', () => actions.drill(i, false));
      }
      item.appendChild(playBtn);

      ladderList.appendChild(item);
    }

    ladderSection.appendChild(ladderList);
    grid.appendChild(ladderSection);

    // 8. Save: Export and Import
    const saveSection = document.createElement('section');
    saveSection.className = 'home-card';

    const saveHeader = document.createElement('div');
    saveHeader.className = 'home-card-header';
    const saveTitle = document.createElement('h2');
    saveTitle.className = 'home-card-title';
    saveTitle.textContent = 'Save Data';
    saveHeader.appendChild(saveTitle);
    saveSection.appendChild(saveHeader);

    const saveActions = document.createElement('div');
    saveActions.className = 'save-actions-row';

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'home-btn-secondary';
    exportBtn.textContent = 'Export Save';
    addEvent(exportBtn, 'click', () => {
      const json = exportJson(data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      activeUrls.push(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-palace-${localDay()}.json`;
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
        const idx = activeUrls.indexOf(url);
        if (idx >= 0) activeUrls.splice(idx, 1);
      }, 1000);
    });
    saveActions.appendChild(exportBtn);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.setAttribute('aria-label', 'Import save file');
    saveSection.appendChild(fileInput);

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'home-btn-secondary';
    importBtn.textContent = 'Import Save';
    addEvent(importBtn, 'click', () => fileInput.click());
    saveActions.appendChild(importBtn);

    saveSection.appendChild(saveActions);

    const errorBanner = document.createElement('div');
    errorBanner.className = 'import-error-banner';
    errorBanner.setAttribute('role', 'alert');
    saveSection.appendChild(errorBanner);

    addEvent(fileInput, 'change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';

      try {
        const text = await file.text();
        const next = importJson(text);
        const confirmed = window.confirm(
          'Import save data? This will replace your current memory palace progress.',
        );
        if (confirmed) {
          actions.replaceSave(next);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorBanner.textContent = `Import failed: ${msg}`;
        errorBanner.style.display = 'block';
      } finally {
        fileInput.value = '';
      }
    });

    grid.appendChild(saveSection);

    panel.appendChild(grid);
  }

  root.appendChild(container);

  // Return unmount cleanup function
  return () => {
    if (ghostInterval !== null) {
      clearInterval(ghostInterval);
      ghostInterval = null;
    }

    if (view) {
      view.clearCards();
    }

    for (const { target, type, handler } of listeners) {
      target.removeEventListener(type, handler);
    }
    listeners.length = 0;

    for (const url of activeUrls) {
      URL.revokeObjectURL(url);
    }
    activeUrls.length = 0;

    root.textContent = '';
  };
}
