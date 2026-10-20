import type { Settings } from './types.ts';

// GLIDE_OPTIONS: Instant, Fast, Normal, Slow
export const GLIDE_OPTIONS = [0, 300, 600, 1000] as const;

/** Repair settings from an import or an old save: wrong types or unknown glideMs values fall back to the defaults in emptySave(). Never mutates. */
export function sanitizeSettings(s: unknown): Settings {
  const defaults: Settings = {
    glideMs: 600,
    sound: false,
    colorSafe: false,
    captions: true,
  };

  if (s === undefined || s === null) return defaults;

  if (typeof s !== 'object' || Array.isArray(s)) return defaults;

  const obj = s as Partial<Settings>;

  // glideMs must be one of GLIDE_OPTIONS, otherwise default to 600
  let glideMs: number = 600;
  if (typeof obj.glideMs === 'number' && GLIDE_OPTIONS.includes(obj.glideMs)) {
    glideMs = obj.glideMs;
  }

  return {
    glideMs,
    sound: typeof obj.sound === 'boolean' ? obj.sound : defaults.sound,
    colorSafe: typeof obj.colorSafe === 'boolean' ? obj.colorSafe : defaults.colorSafe,
    captions: typeof obj.captions === 'boolean' ? obj.captions : defaults.captions,
  };
}

/** Applies what CSS can do: toggles the `color-safe` class on root. */
export function applySettings(s: Settings, root: { classList: { toggle(name: string, on: boolean): unknown } }): void {
  if (s.colorSafe) {
    root.classList.toggle('color-safe', true);
  } else {
    root.classList.toggle('color-safe', false);
  }
}