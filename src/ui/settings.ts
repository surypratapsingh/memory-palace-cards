import { save } from '../store.ts';
import { applySettings, GLIDE_OPTIONS, sanitizeSettings } from '../settings.ts';
import type { SaveData } from '../types.ts';

const GLIDE_LABELS = ['Instant', 'Fast', 'Normal', 'Slow'] as const;
const STRENGTHS = ['new', 'fading', 'learning', 'solid', 'gilded'] as const;

export function mountSettings(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void {
  data.settings = sanitizeSettings(data.settings);
  const screen = document.createElement('main');
  screen.className = 'settings-screen';
  screen.setAttribute('aria-labelledby', 'settings-title');
  root.append(screen);
  let closed = false;

  const persist = () => {
    save(data);
    applySettings(data.settings, document.documentElement);
  };

  function addCheckbox(labelText: string, key: 'sound' | 'colorSafe' | 'captions'): void {
    const label = document.createElement('label');
    label.className = 'settings-checkbox';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = data.settings[key];
    checkbox.addEventListener('change', () => {
      data.settings[key] = checkbox.checked;
      persist();
    });
    label.append(checkbox, document.createTextNode(labelText));
    screen.append(label);
  }

  function render(): void {
    screen.replaceChildren();
    const heading = document.createElement('h1');
    heading.id = 'settings-title';
    heading.textContent = 'Settings';
    screen.append(heading);

    const glideFieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Glide speed';
    glideFieldset.append(legend);
    GLIDE_OPTIONS.forEach((glideMs, index) => {
      const label = document.createElement('label');
      label.className = 'settings-radio';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'glide-speed';
      radio.value = String(glideMs);
      radio.checked = data.settings.glideMs === glideMs;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        data.settings.glideMs = glideMs;
        persist();
      });
      label.append(radio, document.createTextNode(GLIDE_LABELS[index]));
      glideFieldset.append(label);
    });
    const motionNote = document.createElement('p');
    motionNote.className = 'settings-note';
    motionNote.textContent = 'Instant also helps with motion sickness.';
    glideFieldset.append(motionNote);
    screen.append(glideFieldset);

    addCheckbox('Sound', 'sound');
    addCheckbox('Colour-blind-safe colours', 'colorSafe');
    addCheckbox('Captions under cards while memorizing', 'captions');

    const preview = document.createElement('section');
    preview.className = 'settings-preview';
    preview.setAttribute('aria-label', 'Strength colour preview');
    const previewTitle = document.createElement('h2');
    previewTitle.textContent = 'Strength colours preview';
    preview.append(previewTitle);
    for (const strength of STRENGTHS) {
      const tile = document.createElement('span');
      tile.className = 'settings-strength-tile';
      tile.dataset.strength = strength;
      tile.textContent = strength;
      preview.append(tile);
    }
    screen.append(preview);

    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Back';
    back.addEventListener('click', exit);
    screen.append(back);
  }

  function exit(): void {
    if (closed) return;
    persist();
    unmount();
    onExit(data);
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    exit();
  };
  document.addEventListener('keydown', onKeyDown);

  function unmount(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown);
    screen.remove();
  }

  applySettings(data.settings, document.documentElement);
  render();
  return unmount;
}
