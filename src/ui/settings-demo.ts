import { load, save } from '../store.ts';
import type { SaveData } from '../types.ts';
import { mountSettings } from './settings.ts';
import '../style.css';
import './settings.css';

const data = load();
function onExit(next: SaveData): void {
  save(next);
  document.body.replaceChildren();
  const message = document.createElement('p');
  message.textContent = 'Settings closed. Reload to open them again.';
  document.body.append(message);
}

mountSettings(document.body, data, onExit);
