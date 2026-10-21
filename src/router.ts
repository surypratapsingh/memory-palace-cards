export type Screen = 'home' | 'train' | 'drill' | 'settings';
export type Event = 'train' | 'drill' | 'settings' | 'back' | 'result' | 'cancel';

type UnknownEvent = string & {};

export function next(screen: Screen, event: Event | UnknownEvent): Screen {
  switch (screen) {
    case 'home':
      if (event === 'train') return 'train';
      if (event === 'drill') return 'drill';
      if (event === 'settings') return 'settings';
      return screen;
    case 'train':
    case 'settings':
      return event === 'back' ? 'home' : screen;
    case 'drill':
      return event === 'result' || event === 'cancel' ? 'home' : screen;
    default:
      return screen;
  }
}
