import { save, load } from '../store.ts';
import type { SaveData, Settings } from '../types.ts';
import { GLIDE_OPTIONS } from '../settings.ts';

// Glide speed labels
const GLIDE_LABELS = ['Instant', 'Fast', 'Normal', 'Slow'] as const;

export function mountSettings(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void {
  let keyListener: () => void;
  const savedata = { ...data };

  function render() {
    root.innerHTML = '';

    // Glide speed section
    const glideSection = document.createElement('div');
    glideSection.className = 'settings-section';
    const glideLabel = document.createElement('label');
    glideLabel.textContent = 'Glide speed';
    glideSection.appendChild(glideLabel);

    ;(GLIDE_OPTIONS as number[]).forEach((glideMs, i) => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'glide-speed';
      radio.value = String(glideMs);
      radio.id = `glide-${glideMs}`;
      if (savedata.settings.glideMs === glideMs) {
        radio.checked = true;
      }
      radio.addEventListener('change', () => {
        savedata.settings.glideMs = glideMs;
        save(savedata, localStorage);
        applySettings(savedata.settings, { classList: { toggle: (name: string, on: boolean) => {} } });
        render();
      });
      const radioLabel = document.createElement('label');
      radioLabel.htmlFor = `glide-${glideMs}`;
      radioLabel.textContent = GLIDE_LABELS[i] + (glideMs === 0 ? ' (also helps with motion sickness)' : '');
      glideSection.appendChild(radio);
      glideSection.appendChild(radioLabel);
    });

    root.appendChild(glideSection);

    // Sound checkbox
    const soundSection = document.createElement('div');
    soundSection.className = 'settings-section';
    const soundLabel = document.createElement('label');
    soundLabel.textContent = 'Sound';
    const soundCheckbox = document.createElement('input');
    soundCheckbox.type = 'checkbox';
    soundCheckbox.checked = savedata.settings.sound;
    soundCheckbox.addEventListener('change', () => {
      savedata.settings.sound = (soundCheckbox as HTMLInputElement).checked;
      save(savedata, localStorage);
      render();
    });
    soundLabel.appendChild(soundCheckbox);
    soundSection.appendChild(soundLabel);
    root.appendChild(soundSection);

    // Colour-blind-safe colours checkbox
    const cssSection = document.createElement('div');
    cssSection.className = 'settings-section';
    const cssLabel = document.createElement('label');
    cssLabel.textContent = 'Colour-blind-safe colours';
    const cssCheckbox = document.createElement('input');
    cssCheckbox.type = 'checkbox';
    cssCheckbox.checked = savedata.settings.colorSafe;
    cssCheckbox.addEventListener('change', () => {
      savedata.settings.colorSafe = (cssCheckbox as HTMLInputElement).checked;
      save(savedata, localStorage);
      // Apply the color-safe class
      const rootEl = document.documentElement;
      if (savedata.settings.colorSafe) {
        rootEl.classList.add('color-safe');
      } else {
        rootEl.classList.remove('color-safe');
      }
      render();
    });
    cssLabel.appendChild(cssCheckbox);
    cssSection.appendChild(cssLabel);
    root.appendChild(cssSection);

    // Captions checkbox
    const captionsSection = document.createElement('div');
    captionsSection.className = 'settings-section';
    const captionsLabel = document.createElement('label');
    captionsLabel.textContent = 'Captions under cards';
    const captionsCheckbox = document.createElement('input');
    captionsCheckbox.type = 'checkbox';
    captionsCheckbox.checked = savedata.settings.captions;
    captionsCheckbox.addEventListener('change', () => {
      savedata.settings.captions = (captionsCheckbox as HTMLInputElement).checked;
      save(savedata, localStorage);
      render();
    });
    captionsLabel.appendChild(captionsCheckbox);
    captionsSection.appendChild(captionsLabel);
    root.appendChild(captionsSection);

    // Preview row of 5 strength tiles
    const previewSection = document.createElement('div');
    previewSection.className = 'settings-section';
    previewSection.textContent = 'Strength colours preview';
    const strengthNames: ('new' | 'fading' | 'learning' | 'solid' | 'gilded')[] = ['new', 'fading', 'learning', 'solid', 'gilded'];
    strengthNames.forEach((strength) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.strength = strength;
      // Apply the current color scheme
      const rootEl = document.documentElement;
      const colors: Record<string, string> = {
        new: rootEl.classList.contains('color-safe') ? '#8a8a8a' : '#64748b',
        fading: rootEl.classList.contains('color-safe') ? '#d55e00' : '#ef4444',
        learning: rootEl.classList.contains('color-safe') ? '#56b4e9' : '#3b82f6',
        solid: rootEl.classList.contains('color-safe') ? '#009e73' : '#22c55e',
        gilded: rootEl.classList.contains('color-safe') ? '#f0e442' : '#fbbf24',
      };
      tile.style.backgroundColor = colors[strength] || '#ccc';
      tile.textContent = strength;
      previewSection.appendChild(tile);
    });
    root.appendChild(previewSection);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => {
      save(savedata, localStorage);
      onExit(savedata);
    });
    root.appendChild(backBtn);
  }

  // Initial render
  render();

  // Setup keyboard handler
  const keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      save(savedata, localStorage);
      onExit(savedata);
    }
  };

  document.addEventListener('keydown', keydownHandler);

  return () => {
    document.removeEventListener('keydown', keydownHandler);
  };
}