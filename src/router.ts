export type Screen = 'home' | 'train' | 'drill' | 'settings' | 'shadowWalk';
export type Event = 'train' | 'drill' | 'settings' | 'back' | 'result' | 'cancel' | 'shadowWalk';

type UnknownEvent = string & {};

export function next(screen: Screen, event: Event | UnknownEvent): Screen {
  switch (screen) {
    case 'home':
      if (event === 'train') return 'train';
      if (event === 'drill') return 'drill';
      if (event === 'settings') return 'settings';
      if (event === 'shadowWalk') return 'shadowWalk';
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
    default:
      return screen;
  }
}
