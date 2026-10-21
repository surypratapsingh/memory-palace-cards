import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EASE,
  DUR,
  reducedMotion,
  enter,
  exit,
  swap,
  stagger,
  reveal,
  feedback,
  countUp,
  setProgress,
} from './motion.ts';

interface FakeAnimCall {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  animation: FakeAnimation;
}

interface FakeAnimation {
  playState: AnimationPlayState;
  finished: Promise<Animation>;
  cancel: () => void;
  finish: () => void;
  cancelledCount: number;
}

interface FakeElement {
  dataset: Record<string, string | undefined>;
  style: Record<string, string>;
  textContent: string;
  attributes: Map<string, string>;
  parentElement: FakeElement | null;
  removedCount: number;
  animCalls: FakeAnimCall[];
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  removeAttribute: (name: string) => void;
  remove: () => void;
  animate?: (keyframes: Keyframe[], options?: KeyframeAnimationOptions) => Animation;
}

function makeFakeAnimation(autoFinish = false): FakeAnimation {
  let resolveFinished!: (a: Animation) => void;
  const finished = new Promise<Animation>((resolve) => {
    resolveFinished = resolve;
  });

  const anim: FakeAnimation = {
    playState: 'running',
    finished,
    cancelledCount: 0,
    cancel(): void {
      if (anim.playState === 'idle') return;
      anim.playState = 'idle';
      anim.cancelledCount += 1;
      resolveFinished(anim as unknown as Animation);
    },
    finish(): void {
      if (anim.playState !== 'running') return;
      anim.playState = 'finished';
      resolveFinished(anim as unknown as Animation);
    },
  };

  if (autoFinish) {
    anim.finish();
  }
  return anim;
}

function makeFakeElement(opts?: {
  withAnimate?: boolean;
  autoFinish?: boolean;
  onRemove?: () => void;
}): FakeElement {
  const withAnimate = opts?.withAnimate ?? true;
  const autoFinish = opts?.autoFinish ?? false;
  const attributes = new Map<string, string>();
  const animCalls: FakeAnimCall[] = [];

  const el: FakeElement = {
    dataset: {},
    style: {},
    textContent: '',
    attributes,
    parentElement: null,
    removedCount: 0,
    animCalls,
    setAttribute(name: string, value: string): void {
      attributes.set(name, value);
    },
    getAttribute(name: string): string | null {
      return attributes.get(name) ?? null;
    },
    removeAttribute(name: string): void {
      attributes.delete(name);
    },
    remove(): void {
      el.removedCount += 1;
      opts?.onRemove?.();
    },
  };

  if (withAnimate) {
    el.animate = (keyframes: Keyframe[], options: KeyframeAnimationOptions = {}): Animation => {
      const animation = makeFakeAnimation(autoFinish);
      animCalls.push({ keyframes, options, animation });
      return animation as unknown as Animation;
    };
  }

  return el;
}

function asEl(fake: FakeElement): HTMLElement {
  return fake as unknown as HTMLElement;
}

const ALLOWED_KEYFRAME_KEYS = new Set([
  'transform',
  'opacity',
  'filter',
  'offset',
  'easing',
  'composite',
]);

describe('Memory Palace UI motion kit', () => {
  const origMatchMedia = globalThis.matchMedia;
  const origDocument = globalThis.document;
  const origRAF = globalThis.requestAnimationFrame;
  const origCAF = globalThis.cancelAnimationFrame;
  const origPerfNow = performance.now;

  let prefersReduced = false;
  let rootClasses = new Set<string>();
  let clockMs = 0;
  let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let nextRafId = 1;

  beforeEach(() => {
    prefersReduced = false;
    rootClasses = new Set<string>();
    clockMs = 1000;
    rafQueue = [];
    nextRafId = 1;

    globalThis.matchMedia = ((query: string): MediaQueryList => ({
      matches: query.includes('prefers-reduced-motion') ? prefersReduced : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof globalThis.matchMedia;

    globalThis.document = {
      documentElement: {
        classList: {
          contains: (cls: string): boolean => rootClasses.has(cls),
        },
      },
    } as unknown as Document;

    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      const id = nextRafId++;
      rafQueue.push({ id, cb });
      return id;
    }) as typeof globalThis.requestAnimationFrame;

    globalThis.cancelAnimationFrame = ((id: number): void => {
      rafQueue = rafQueue.filter((item) => item.id !== id);
    }) as typeof globalThis.cancelAnimationFrame;

    performance.now = (): number => clockMs;
  });

  afterEach(() => {
    globalThis.matchMedia = origMatchMedia;
    globalThis.document = origDocument;
    globalThis.requestAnimationFrame = origRAF;
    globalThis.cancelAnimationFrame = origCAF;
    performance.now = origPerfNow;
  });

  function stepRaf(deltaMs: number): void {
    clockMs += deltaMs;
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const item of batch) {
      item.cb(clockMs);
    }
  }

  it('1. restricts every keyframe of every helper to allowed compositor/WAAPI keys', () => {
    const e1 = makeFakeElement();
    const e2 = makeFakeElement();
    const e3 = makeFakeElement();
    const e4 = makeFakeElement();
    const e5 = makeFakeElement();
    const e6 = makeFakeElement();

    enter(asEl(e1));
    void exit(asEl(e2));
    stagger([asEl(e3)]);
    reveal(asEl(e4));
    feedback(asEl(e5), 'correct');
    feedback(asEl(e6), 'wrong');

    const allCalls = [
      ...e1.animCalls,
      ...e2.animCalls,
      ...e3.animCalls,
      ...e4.animCalls,
      ...e5.animCalls,
      ...e6.animCalls,
    ];
    assert.equal(allCalls.length, 6);

    for (const call of allCalls) {
      assert.notEqual(call.options.fill, 'forwards');
      for (const frame of call.keyframes) {
        for (const key of Object.keys(frame)) {
          assert.ok(
            ALLOWED_KEYFRAME_KEYS.has(key),
            `Disallowed keyframe property "${key}"`,
          );
        }
      }
    }
  });

  it('2. keeps all durations <= 300ms except countUp, with exit shorter than enter', () => {
    assert.ok(DUR.exit < DUR.enter);
    assert.equal(DUR.count, 600);

    for (const [name, val] of Object.entries(DUR)) {
      if (name === 'count') continue;
      assert.ok(val <= 300, `Expected DUR.${name} (${val}) <= 300`);
    }

    const e1 = makeFakeElement();
    const e2 = makeFakeElement();
    const e3 = makeFakeElement();
    const e4 = makeFakeElement();

    enter(asEl(e1));
    void exit(asEl(e2));
    reveal(asEl(e3));
    feedback(asEl(e4), 'correct');

    for (const el of [e1, e2, e3, e4]) {
      const dur = Number(el.animCalls[0]?.options.duration);
      assert.ok(dur <= 300, `Expected runtime duration ${dur} <= 300`);
    }
    assert.equal(EASE.out, 'cubic-bezier(0.23, 1, 0.32, 1)');
  });

  it('3. reveal() animates opacity only and never uses transform', () => {
    const el = makeFakeElement();
    reveal(asEl(el));

    assert.equal(el.animCalls.length, 1);
    const call = el.animCalls[0]!;
    assert.equal(call.options.duration, DUR.reveal);
    assert.equal(call.options.easing, EASE.out);
    for (const frame of call.keyframes) {
      assert.equal('transform' in frame, false);
      assert.equal('opacity' in frame, true);
    }
  });

  it('4. a second feedback() on the same element cancels the first animation', () => {
    const el = makeFakeElement();
    const first = feedback(asEl(el), 'correct') as unknown as FakeAnimation;
    assert.ok(first);
    assert.equal(el.dataset.result, 'correct');
    assert.equal(first.cancelledCount, 0);

    const second = feedback(asEl(el), 'wrong') as unknown as FakeAnimation;
    assert.ok(second);
    assert.equal(el.dataset.result, 'wrong');
    assert.equal(first.cancelledCount, 1);
    assert.equal(el.animCalls.length, 2);

    const cleared = feedback(asEl(el), null);
    assert.equal(cleared, null);
    assert.equal(el.dataset.result, undefined);
    assert.equal(second.cancelledCount, 1);
  });

  it('5. respects reduced motion via matchMedia', () => {
    prefersReduced = true;
    assert.equal(reducedMotion(), true);

    const enterEl = makeFakeElement();
    enter(asEl(enterEl), 120);
    assert.equal(enterEl.animCalls.length, 1);
    assert.equal(enterEl.animCalls[0]!.options.duration, 160);
    assert.equal(enterEl.animCalls[0]!.options.delay, 0);
    for (const frame of enterEl.animCalls[0]!.keyframes) {
      assert.equal('transform' in frame, false);
    }

    const fbEl = makeFakeElement();
    const fbAnim = feedback(asEl(fbEl), 'wrong');
    assert.equal(fbAnim, null);
    assert.equal(fbEl.dataset.result, 'wrong');
    assert.equal(fbEl.animCalls.length, 0);

    const countEl = makeFakeElement();
    countUp(asEl(countEl), 48);
    assert.equal(countEl.textContent, '48');
    assert.equal(rafQueue.length, 0);
  });

  it('6. respects reduced motion via html.reduce-motion class', () => {
    rootClasses.add('reduce-motion');
    assert.equal(reducedMotion(), true);

    const staggerEls = [makeFakeElement(), makeFakeElement(), makeFakeElement()];
    stagger(staggerEls.map(asEl));
    for (const item of staggerEls) {
      assert.equal(item.animCalls.length, 1);
      assert.equal(item.animCalls[0]!.options.delay, 0);
      assert.equal(item.animCalls[0]!.options.duration, 160);
      for (const frame of item.animCalls[0]!.keyframes) {
        assert.equal('transform' in frame, false);
      }
    }

    const fbEl = makeFakeElement();
    assert.equal(feedback(asEl(fbEl), 'correct'), null);
    assert.equal(fbEl.dataset.result, 'correct');

    const countEl = makeFakeElement();
    countUp(asEl(countEl), 99, { format: (n) => `${n}%` });
    assert.equal(countEl.textContent, '99%');
    assert.equal(rafQueue.length, 0);
  });

  it('7. exit() resolves on finish, on cancel, and immediately when animate is missing', async () => {
    const finishEl = makeFakeElement();
    let finishResolved = false;
    const pFinish = exit(asEl(finishEl)).then(() => {
      finishResolved = true;
    });
    assert.equal(finishResolved, false);
    finishEl.animCalls[0]!.animation.finish();
    await pFinish;
    assert.equal(finishResolved, true);

    const cancelEl = makeFakeElement();
    let cancelResolved = false;
    const pCancel = exit(asEl(cancelEl)).then(() => {
      cancelResolved = true;
    });
    cancelEl.animCalls[0]!.animation.cancel();
    await pCancel;
    assert.equal(cancelResolved, true);

    const plainEl = makeFakeElement({ withAnimate: false });
    await exit(asEl(plainEl));
    assert.equal(plainEl.animCalls.length, 0);
  });

  it('8. stagger() on 10 elements applies delays 0, 40, ..., 240, 240, 240 with fill backwards', () => {
    const elements = Array.from({ length: 10 }, () => makeFakeElement());
    stagger(elements.map(asEl));

    const delays = elements.map((el) => el.animCalls[0]?.options.delay);
    assert.deepEqual(delays, [0, 40, 80, 120, 160, 200, 240, 240, 240, 240]);

    for (const el of elements) {
      assert.equal(el.animCalls[0]?.options.fill, 'backwards');
    }
  });

  it('9. setProgress() clamps [-1, 2, NaN] to [0, 1] and updates parent progressbar aria-valuenow', () => {
    const track = makeFakeElement();
    track.setAttribute('role', 'progressbar');
    const bar = makeFakeElement();
    bar.parentElement = track;

    setProgress(asEl(bar), -1);
    assert.equal(bar.style.transform, 'scaleX(0)');
    assert.equal(track.getAttribute('aria-valuenow'), '0');

    setProgress(asEl(bar), 2);
    assert.equal(bar.style.transform, 'scaleX(1)');
    assert.equal(track.getAttribute('aria-valuenow'), '100');

    setProgress(asEl(bar), Number.NaN);
    assert.equal(bar.style.transform, 'scaleX(0)');
    assert.equal(track.getAttribute('aria-valuenow'), '0');

    setProgress(asEl(bar), 0.25);
    assert.equal(bar.style.transform, 'scaleX(0.25)');
    assert.equal(track.getAttribute('aria-valuenow'), '25');
  });

  it('10. countUp() sets aria-label immediately, steps with ease-out cubic, and jumps to final on cancel()', () => {
    const el = makeFakeElement();
    const format = (n: number): string => `${n} cards`;
    const cancel = countUp(asEl(el), 48, { from: 0, ms: 600, format });

    assert.equal(el.getAttribute('aria-label'), '48 cards');
    assert.equal(el.textContent, '0 cards');

    stepRaf(300); // half-way in time -> 0.875 of value (42)
    assert.equal(el.textContent, '42 cards');

    stepRaf(300); // 600ms elapsed -> complete
    assert.equal(el.textContent, '48 cards');
    assert.equal(rafQueue.length, 0);

    // Test mid-flight cancel jumping to final value and non-finite fallback
    const elCancel = makeFakeElement();
    const stopEarly = countUp(asEl(elCancel), 52, { from: 10, ms: 600 });
    stepRaf(100);
    assert.notEqual(elCancel.textContent, '52');
    stopEarly();
    assert.equal(elCancel.textContent, '52');
    assert.equal(rafQueue.length, 0);

    cancel();
    const nanEl = makeFakeElement();
    countUp(asEl(nanEl), Number.NaN);
    assert.equal(nanEl.textContent, '0');
  });

  it('11. swap() removes from before mount, supports from = null, and interrupts an in-flight swap cleanly', async () => {
    const events: string[] = [];
    const mounted = new Set<FakeElement>();

    const makeScreen = (name: string): FakeElement => {
      const screen = makeFakeElement({
        onRemove: () => {
          events.push(`remove:${name}`);
          mounted.delete(screen);
        },
      });
      return screen;
    };

    const mount = (name: string) => (el: HTMLElement): void => {
      events.push(`mount:${name}`);
      mounted.add(el as unknown as FakeElement);
    };

    const screenA = makeScreen('A');
    await swap(null, asEl(screenA), mount('A'));
    assert.deepEqual(events, ['mount:A']);
    assert.equal(mounted.has(screenA), true);

    events.length = 0;
    const screenB = makeScreen('B');
    const pSwap1 = swap(asEl(screenA), asEl(screenB), mount('B'));
    // While screenA is still exiting, start a second swap to screenC
    const screenC = makeScreen('C');
    const pSwap2 = swap(asEl(screenB), asEl(screenC), mount('C'));

    // First swap must have finished immediately: screenA exit cancelled, removed, screenB mounted
    await pSwap1;
    assert.equal(screenA.animCalls[0]!.animation.cancelledCount, 1);
    assert.deepEqual(events, ['remove:A', 'mount:B']);

    // Finish screenB's exit in the second swap
    // Lead: an interrupted swap mounts B without an enter animation, so the exit is B's last call.
    screenB.animCalls.at(-1)!.animation.finish();
    await pSwap2;

    assert.deepEqual(events, ['remove:A', 'mount:B', 'remove:B', 'mount:C']);
    assert.equal(mounted.size, 1);
    assert.equal(mounted.has(screenC), true);
  });

  it('12. never throws in Node when animate, matchMedia, and document are completely absent', async () => {
    // @ts-expect-error simulating missing browser globals in pure Node environment
    delete globalThis.matchMedia;
    // @ts-expect-error simulating missing browser globals in pure Node environment
    delete globalThis.document;
    // @ts-expect-error simulating missing browser globals in pure Node environment
    delete globalThis.requestAnimationFrame;
    // @ts-expect-error simulating missing browser globals in pure Node environment
    delete globalThis.cancelAnimationFrame;

    const a = makeFakeElement({ withAnimate: false });
    const b = makeFakeElement({ withAnimate: false });

    assert.equal(reducedMotion(), false);
    assert.equal(enter(asEl(a)), null);
    await exit(asEl(a));
    await swap(asEl(a), asEl(b), () => {});
    stagger([asEl(a), asEl(b)]);
    assert.equal(reveal(asEl(a)), null);
    assert.equal(feedback(asEl(a), 'correct'), null);
    assert.equal(a.dataset.result, 'correct');

    const cancelCount = countUp(asEl(a), 35);
    assert.equal(a.textContent, '35');
    cancelCount();

    setProgress(asEl(a), 0.5);
    assert.equal(a.style.transform, 'scaleX(0.5)');
  });
});