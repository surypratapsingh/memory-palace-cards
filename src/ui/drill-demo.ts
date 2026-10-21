import { createPalaceView } from '../scene/palaceView.ts';
import { load } from '../store.ts';
import type { DrillResult, PalaceView, SaveData } from '../types.ts';
import { mountDrill } from './drill.ts';

declare global {
  interface Window {
    __view: PalaceView;
    __drill?: {
      mount: (level?: number, daily?: boolean) => void;
      unmount: () => void;
      data: SaveData;
      lastResult: DrillResult | null;
    };
  }
}

const sceneContainer = document.getElementById('scene-container');
const drillRoot = document.getElementById('drill-root');
const levelSelect = document.getElementById('level-select') as HTMLSelectElement | null;
const dailyCheck = document.getElementById('daily-check') as HTMLInputElement | null;
const btnRestart = document.getElementById('btn-restart');
const btnUnmount = document.getElementById('btn-unmount');

if (!sceneContainer || !drillRoot) {
  throw new Error('Missing scene or drill container');
}

const view = createPalaceView(sceneContainer);
window.__view = view;

let saveData = load();
let unmountFn: (() => void) | null = null;
let lastResult: DrillResult | null = null;

function runDrill(level = 0, daily = false): void {
  if (unmountFn) {
    unmountFn();
    unmountFn = null;
  }
  if (!drillRoot) return;

  unmountFn = mountDrill(
    drillRoot,
    view,
    saveData,
    { level, daily },
    (updatedData, result) => {
      saveData = updatedData;
      lastResult = result;
      console.log('Drill exited with result:', result);
      // Remount ready screen for convenience in demo
      runDrill(level, daily);
    },
  );
}

// Check query params for initial config (e.g. ?level=2&daily=1)
const params = new URLSearchParams(window.location.search);
const initLevel = parseInt(params.get('level') ?? '0', 10);
const initDaily = params.get('daily') === '1' || params.get('daily') === 'true';

if (levelSelect) levelSelect.value = String(initLevel);
if (dailyCheck) dailyCheck.checked = initDaily;

runDrill(initLevel, initDaily);

if (btnRestart) {
  btnRestart.addEventListener('click', () => {
    const lvl = parseInt(levelSelect?.value ?? '0', 10);
    const dly = Boolean(dailyCheck?.checked);
    runDrill(lvl, dly);
  });
}

if (btnUnmount) {
  btnUnmount.addEventListener('click', () => {
    if (unmountFn) {
      unmountFn();
      unmountFn = null;
      btnUnmount.textContent = 'Remount';
    } else {
      const lvl = parseInt(levelSelect?.value ?? '0', 10);
      const dly = Boolean(dailyCheck?.checked);
      runDrill(lvl, dly);
      btnUnmount.textContent = 'Unmount';
    }
  });
}

if (levelSelect) {
  levelSelect.addEventListener('change', () => {
    const lvl = parseInt(levelSelect.value, 10);
    const dly = Boolean(dailyCheck?.checked);
    runDrill(lvl, dly);
  });
}

if (dailyCheck) {
  dailyCheck.addEventListener('change', () => {
    const lvl = parseInt(levelSelect?.value ?? '0', 10);
    const dly = Boolean(dailyCheck.checked);
    runDrill(lvl, dly);
  });
}

window.__drill = {
  mount: (lvl = 0, dly = false) => runDrill(lvl, dly),
  unmount: () => {
    if (unmountFn) {
      unmountFn();
      unmountFn = null;
    }
  },
  get data() {
    return saveData;
  },
  get lastResult() {
    return lastResult;
  },
};
