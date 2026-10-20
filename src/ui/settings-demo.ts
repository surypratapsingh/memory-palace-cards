import { mountSettings, load } from './settings.ts';
import type { SaveData } from '../types.ts';

const body = document.body;
const saveData = load();
const onExit = (data: SaveData) => {
  console.log('Settings exited', data);
};

const unmount = mountSettings(body, saveData, onExit);

// Demo: toggle settings with keyboard
let tabbable: HTMLElement[] = [];
let currentIndex = 0;

function initTabbable() {
  tabbable = Array.from(body.querySelectorAll('input, button, [tabindex]'));
  currentIndex = 0;
  if (tabbable.length > 0) {
    tabbable[0]!.focus();
  }
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    unmount();
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    currentIndex = (currentIndex + 1) % tabbable.length;
    tabbable[currentIndex]!.focus();
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    currentIndex = (currentIndex - 1 + tabbable.length) % tabbable.length;
    tabbable[currentIndex]!.focus();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.click();
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      el.click();
    } else if (el instanceof HTMLButtonElement) {
      el.click();
    }
  }
}

document.addEventListener('keydown', handleKey);

setTimeout(initTabbable, 100);