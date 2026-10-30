import type { SaveData } from './types.ts';

export type Screen = 'home' | 'train' | 'drill' | 'settings' | 'shadowWalk' | 'onboarding';
export type Event = 'train' | 'drill' | 'settings' | 'back' | 'result' | 'cancel' | 'shadowWalk' | 'onboarding' | 'skip';

type UnknownEvent = string & {};

export function isFresh(data?: Pick<SaveData, 'drills' | 'srs'> | null): boolean {
  if (!data) return true;
  const drills = Array.isArray(data.drills) ? data.drills : [];
  const srs = data.srs && typeof data.srs === 'object' ? data.srs : {};
  return drills.length === 0 && Object.keys(srs).length === 0;
}

export function initialScreen(data?: Pick<SaveData, 'drills' | 'srs'> | null): Screen {
  return isFresh(data) ? 'onboarding' : 'home';
}

export function next(screen: Screen, event: Event | UnknownEvent): Screen {
  switch (screen) {
    case 'home':
      if (event === 'train') return 'train';
      if (event === 'drill') return 'drill';
      if (event === 'settings') return 'settings';
      if (event === 'shadowWalk') return 'shadowWalk';
      if (event === 'onboarding') return 'onboarding';
      return screen;
    case 'train':
    case 'settings':
      return event === 'back' ? 'home' : screen;
    case 'drill':
      if (event === 'result' || event === 'cancel') return 'home';
      if (event === 'shadowWalk') return 'shadowWalk';
      return screen;
    case 'shadowWalk':
      return event === 'back' ? 'home' : screen;
    case 'onboarding':
      if (event === 'skip' || event === 'cancel' || event === 'back' || event === 'result') return 'home';
      return screen;
    default:
      return screen;
  }
}
