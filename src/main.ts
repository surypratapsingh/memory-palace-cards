import './style.css';
import './ui/motion.css';
import './ui/home.css';
import './ui/trainer.css';
import './ui/settings.css';
import './ui/drill.css';
import './ui/onboarding.css';
import { localDay } from './deck.ts';
import { updateStreak } from './progress.ts';
import { applySettings, sanitizeSettings } from './settings.ts';
import { createPalaceView } from './scene/palaceView.ts';
import { load, save, setSaveErrorHandler } from './store.ts';
import { stopAll } from './sound.ts';
import type { PalaceView, SaveData } from './types.ts';
import { mountDrill } from './ui/drill.ts';
import { mountHome } from './ui/home.ts';
import { mountOnboarding } from './ui/onboarding.ts';
import { mountSettings } from './ui/settings.ts';
import { mountShadowWalk } from './ui/shadowWalk.ts';
import { mountTrainer } from './ui/trainer.ts';
import { countUp, feedback, swap } from './ui/motion.ts';
import { initialScreen, next, type Screen } from './router.ts';

const scene = document.querySelector<HTMLElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
const saveError = document.querySelector<HTMLElement>('#save-error');
if (!scene || !ui || !saveError) throw new Error('App shell is incomplete');
const uiRoot = ui;
const saveErrorBanner = saveError;

let data: SaveData = load();
const hasProgress = data.drills.length > 0 || Object.keys(data.srs).length > 0 ||
  Object.keys(data.images).length > 0 || Object.keys(data.locusStats).length > 0 ||
  data.streak.lastDay !== '' || data.streak.count > 0;
if (!hasProgress && globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
  data.settings.glideMs = 0;
}
data.settings = sanitizeSettings(data.settings);

const view: PalaceView = createPalaceView(scene);
let currentScreen: Screen = initialScreen(data);
let currentElement: HTMLElement | null = null;
let unmountCurrent: (() => void) | null = null;
let drillOptions = { level: 0, daily: false };
let closed = false;
const swapWatchdogs = new Set<ReturnType<typeof setTimeout>>();

function syncSettings(): void {
  data.settings = sanitizeSettings(data.settings);
  if (!data.settings.sound) {
    stopAll();
  }
  view.setGlideMs(data.settings.glideMs);
  applySettings(data.settings, document.documentElement);
}
syncSettings();
view.setFreeWalk(false);
void view.glideTo(0);

setSaveErrorHandler(() => {
  saveErrorBanner.hidden = false;
});

function mountScreen(screen: Screen, root: HTMLElement): () => void {
  if (screen === 'home') {
    view.setFreeWalk(false);
    view.setLocusMood(0, 'normal');
    view.clearCards();
    void view.glideTo(0);
    return mountHome(root, data, {
      train: () => navigate('train'),
      drill: (level, daily) => {
        drillOptions = { level, daily };
        navigate('drill');
      },
      settings: () => navigate('settings'),
      shadowWalk: () => navigate('shadowWalk'),
      replaceSave,
    }, view);
  }
  if (screen === 'train') {
    view.setFreeWalk(false);
    return mountTrainer(root, data, (updated) => {
      data = updated;
      syncSettings();
      navigate('back');
    });
  }
  if (screen === 'settings') {
    view.setFreeWalk(false);
    return mountSettings(root, data, (updated) => {
      data = updated;
      syncSettings();
      navigate('back');
    });
  }
  if (screen === 'shadowWalk') {
    return mountShadowWalk(root, view, data, () => {
      navigate('back');
    });
  }
  if (screen === 'onboarding') {
    view.setFreeWalk(false);
    view.setLocusMood(0, 'normal');
    view.clearCards();
    void view.glideTo(0);
    return mountOnboarding(root, view, data, (updated) => {
      data = updated;
      syncSettings();
      navigate('result');
    }, () => {
      navigate('skip');
    });
  }
  view.setFreeWalk(false);
  return mountDrill(root, view, data, drillOptions, (updated, result) => {
    data = updated;
    if (result) data.streak = updateStreak(data.streak, localDay());
    save(data);
    syncSettings();
    navigate(result ? 'result' : 'cancel');
  }, (updated, result) => {
    data = updated;
    if (result) data.streak = updateStreak(data.streak, localDay());
    save(data);
    syncSettings();
    navigate('shadowWalk');
  });
}

function render(screen: Screen, force = false): void {
  if (closed || (!force && screen === currentScreen)) return;
  stopAll();
  const from = currentElement;
  currentScreen = screen;
  const to = document.createElement('section');
  to.className = `screen-root screen-${screen}`;
  to.setAttribute('aria-label', screen === 'train' ? 'Card image training' : screen);
  currentElement = to;
  const transition = swap(from, to, (element) => {
    unmountCurrent?.();
    unmountCurrent = mountScreen(screen, element);
    uiRoot.appendChild(element);
  });
  if (from) {
    const watchdog = setTimeout(() => {
      swapWatchdogs.delete(watchdog);
      if (currentElement !== to || !from.isConnected) return;
      for (const animation of from.getAnimations()) {
        if (animation.playState === 'running') animation.finish();
      }
    }, 400);
    swapWatchdogs.add(watchdog);
    void transition.then(() => {
      clearTimeout(watchdog);
      swapWatchdogs.delete(watchdog);
    });
  }
}

function navigate(event: string): void {
  render(next(currentScreen, event));
}

function replaceSave(nextSave: SaveData): void {
  nextSave.settings = sanitizeSettings(nextSave.settings);
  const saved = save(nextSave);
  data = load();
  data.settings = sanitizeSettings(data.settings);
  saveErrorBanner.hidden = saved;
  syncSettings();
  render(initialScreen(data), true);
}

uiRoot.addEventListener('change', () => {
  if (currentScreen === 'settings') syncSettings();
});

const motionObserver = new MutationObserver(() => {
  for (const panel of uiRoot.querySelectorAll<HTMLElement>('.results-container')) {
    if (panel.dataset.motionReady) continue;
    panel.dataset.motionReady = 'true';
    for (const row of panel.querySelectorAll<HTMLElement>('.results-table tbody tr')) {
      feedback(row, row.classList.contains('correct') ? 'correct' : 'wrong');
    }
    const accuracy = [...panel.querySelectorAll<HTMLElement>('.stat-box')]
      .find((box) => box.querySelector('.stat-label')?.textContent === 'Accuracy');
    const value = accuracy?.querySelector<HTMLElement>('.stat-value');
    const match = value?.textContent?.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (value && match) {
      const correct = Number(match[1]);
      const total = Number(match[2]);
      countUp(value, correct, { from: 0, format: (n) => `${n} / ${total}` });
    }
  }
});
motionObserver.observe(uiRoot, { childList: true, subtree: true });

render(initialScreen(data), true);

window.addEventListener('pagehide', () => {
  if (closed) return;
  closed = true;
  for (const watchdog of swapWatchdogs) clearTimeout(watchdog);
  swapWatchdogs.clear();
  motionObserver.disconnect();
  unmountCurrent?.();
  unmountCurrent = null;
  view.dispose();
}, { once: true });

export { view };
