import type { Settings } from './types.ts';

export const GLIDE_OPTIONS = [0, 300, 600, 1000] as const;

const DEFAULTS: Settings = { glideMs: 600, sound: false, colorSafe: false, captions: true };
type SettingsKey = keyof Settings;

function ownValue(source: object, key: SettingsKey): unknown {
  return Object.hasOwn(source, key) ? (source as Record<SettingsKey, unknown>)[key] : undefined;
}

/** Repair settings from an import or old save without mutating the input. */
export function sanitizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULTS };
  const source = value as object;
  const glideMs = ownValue(source, 'glideMs');
  const sound = ownValue(source, 'sound');
  const colorSafe = ownValue(source, 'colorSafe');
  const captions = ownValue(source, 'captions');
  return {
    glideMs: typeof glideMs === 'number' && GLIDE_OPTIONS.includes(glideMs as typeof GLIDE_OPTIONS[number])
      ? glideMs as Settings['glideMs']
      : DEFAULTS.glideMs,
    sound: typeof sound === 'boolean' ? sound : DEFAULTS.sound,
    colorSafe: typeof colorSafe === 'boolean' ? colorSafe : DEFAULTS.colorSafe,
    captions: typeof captions === 'boolean' ? captions : DEFAULTS.captions,
  };
}

/** Toggle root CSS classes: colour-safe palette, and reduce-motion when glides are instant (read by src/ui/motion.ts). */
export function applySettings(
  settings: Settings,
  root: { classList: { toggle(name: string, on: boolean): unknown } },
): void {
  root.classList.toggle('color-safe', settings.colorSafe);
  root.classList.toggle('reduce-motion', settings.glideMs === 0);
}