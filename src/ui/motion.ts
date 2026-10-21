export const EASE: {
  readonly out: string;
  readonly inOut: string;
  readonly drawer: string;
} = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

export const DUR: {
  readonly press: 140;
  readonly small: 160;
  readonly reveal: 140;
  readonly feedback: 220;
  readonly enter: 240;
  readonly exit: 160;
  readonly staggerStep: 40;
  readonly staggerMax: 240;
  readonly count: 600;
} = {
  press: 140,
  small: 160,
  reveal: 140,
  feedback: 220,
  enter: 240,
  exit: 160,
  staggerStep: 40,
  staggerMax: 240,
  count: 600,
};

const activeAnimations = new WeakMap<HTMLElement, Animation>();
const activeCounts = new WeakMap<HTMLElement, () => void>();

interface ActiveSwap {
  from: HTMLElement | null;
  to: HTMLElement;
  finishImmediate: () => void;
}

let currentSwap: ActiveSwap | null = null;

export function reducedMotion(): boolean {
  const hasRootClass =
    typeof document !== 'undefined' &&
    Boolean(document.documentElement?.classList?.contains('reduce-motion'));
  if (hasRootClass) return true;

  if (typeof globalThis.matchMedia === 'function') {
    const mq = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq?.matches) return true;
  }
  return false;
}

function cancelTrackedAnimation(el: HTMLElement): void {
  const prev = activeAnimations.get(el);
  if (prev) {
    activeAnimations.delete(el);
    if (typeof prev.cancel === 'function') {
      prev.cancel();
    }
  }
}

function runAnimation(
  el: HTMLElement | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!el) return null;
  cancelTrackedAnimation(el);

  if (typeof el.animate !== 'function') {
    return null;
  }

  const anim = el.animate(keyframes, options);
  if (!anim) return null;

  activeAnimations.set(el, anim);

  const cleanup = (): void => {
    if (activeAnimations.get(el) === anim) {
      activeAnimations.delete(el);
    }
  };
  if (anim.finished && typeof anim.finished.then === 'function') {
    anim.finished.then(cleanup, cleanup);
  }

  return anim;
}

export function enter(el: HTMLElement, delayMs = 0): Animation | null {
  const reduced = reducedMotion();
  const keyframes: Keyframe[] = reduced
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ];

  const delay = reduced ? 0 : Math.max(0, Number.isFinite(delayMs) ? delayMs : 0);

  return runAnimation(el, keyframes, {
    duration: reduced ? DUR.small : DUR.enter,
    easing: EASE.out,
    delay,
    fill: 'backwards',
  });
}

export function exit(el: HTMLElement): Promise<void> {
  const anim = runAnimation(
    el,
    [{ opacity: 1 }, { opacity: 0 }],
    {
      duration: DUR.exit,
      easing: EASE.out,
      fill: 'none',
    },
  );

  if (!anim) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (settled) return;
      settled = true;
      if (activeAnimations.get(el) === anim) {
        activeAnimations.delete(el);
      }
      resolve();
    };

    // Ensure calling anim.cancel() resolves even if a test fake does not settle finished.
    if (typeof anim.cancel === 'function') {
      const origCancel = anim.cancel.bind(anim);
      anim.cancel = (): void => {
        origCancel();
        settle();
      };
    }

    if (anim.finished && typeof anim.finished.then === 'function') {
      anim.finished.then(settle, settle);
    } else {
      settle();
    }
  });
}

export function swap(
  from: HTMLElement | null,
  to: HTMLElement,
  mount: (el: HTMLElement) => void,
): Promise<void> {
  let effectiveFrom = from;

  if (currentSwap) {
    const prevFrom = currentSwap.from;
    const prevTo = currentSwap.to;
    currentSwap.finishImmediate();
    // If the caller passed the old `from` while the previous swap was still in flight,
    // `prevTo` is now the mounted screen that must be replaced by this new swap.
    if (effectiveFrom === prevFrom && prevTo !== to) {
      effectiveFrom = prevTo;
    }
  }

  if (!effectiveFrom) {
    mount(to);
    enter(to);
    return Promise.resolve();
  }

  const exitingEl = effectiveFrom;
  let completed = false;
  let resolveSwap!: () => void;

  const completeSwap = (animateEnter: boolean): void => {
    if (completed) return;
    completed = true;
    if (currentSwap === swapState) {
      currentSwap = null;
    }
    exitingEl.remove?.();
    mount(to);
    if (animateEnter) {
      enter(to);
    }
    resolveSwap();
  };

  const swapState: ActiveSwap = {
    from: exitingEl,
    to,
    finishImmediate: (): void => {
      cancelTrackedAnimation(exitingEl);
      completeSwap(false);
    },
  };

  currentSwap = swapState;

  return new Promise<void>((resolve) => {
    resolveSwap = resolve;
    void exit(exitingEl).then(() => {
      completeSwap(true);
    });
  });
}

export function stagger(els: readonly HTMLElement[]): void {
  const reduced = reducedMotion();
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    const delay = reduced ? 0 : Math.min(i * DUR.staggerStep, DUR.staggerMax);
    enter(el, delay);
  }
}

export function reveal(el: HTMLElement): Animation | null {
  return runAnimation(
    el,
    [{ opacity: 0 }, { opacity: 1 }],
    {
      duration: DUR.reveal,
      easing: EASE.out,
      fill: 'none',
    },
  );
}

export function feedback(
  el: HTMLElement,
  result: 'correct' | 'wrong' | null,
): Animation | null {
  if (!el) return null;

  if (el.dataset) {
    if (result === null) {
      delete el.dataset.result;
    } else {
      el.dataset.result = result;
    }
  }

  if (result === null || reducedMotion()) {
    cancelTrackedAnimation(el);
    return null;
  }

  const keyframes: Keyframe[] =
    result === 'correct'
      ? [
          { transform: 'scale(1)' },
          { transform: 'scale(1.03)' },
          { transform: 'scale(1)' },
        ]
      : [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(2px)' },
          { transform: 'translateX(0)' },
        ];

  return runAnimation(el, keyframes, {
    duration: DUR.feedback,
    easing: EASE.out,
    fill: 'none',
  });
}

function readClock(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function countUp(
  el: HTMLElement,
  to: number,
  opts?: { from?: number; ms?: number; format?: (n: number) => string },
): () => void {
  if (!el) return () => {};

  const prevStop = activeCounts.get(el);
  if (prevStop) {
    prevStop();
  }

  const safeTo = Number.isFinite(to) ? to : 0;
  const rawFrom = opts?.from ?? 0;
  const safeFrom = Number.isFinite(rawFrom) ? rawFrom : 0;
  const rawMs = opts?.ms ?? DUR.count;
  const duration = Number.isFinite(rawMs) && rawMs > 0 ? rawMs : 0;
  const format = opts?.format ?? ((n: number): string => String(Math.round(n)));

  const finalText = format(Math.round(safeTo));
  if (typeof el.setAttribute === 'function') {
    el.setAttribute('aria-label', finalText);
  }

  if (
    reducedMotion() ||
    duration <= 0 ||
    safeFrom === safeTo ||
    typeof globalThis.requestAnimationFrame !== 'function'
  ) {
    el.textContent = finalText;
    return (): void => {
      el.textContent = finalText;
    };
  }

  const startTime = readClock();
  el.textContent = format(Math.round(safeFrom));

  let rafId: number | null = null;
  let stopped = false;

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (activeCounts.get(el) === stop) {
      activeCounts.delete(el);
    }
    if (rafId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(rafId);
    }
  };

  const tick = (frameTime?: number): void => {
    if (stopped) return;
    const now = readClock();
    const current =
      typeof frameTime === 'number' && Number.isFinite(frameTime)
        ? Math.max(frameTime, now)
        : now;
    const elapsed = Math.max(0, current - startTime);
    const t = Math.min(1, elapsed / duration);

    if (t >= 1) {
      stop();
      el.textContent = finalText;
      return;
    }

    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(safeFrom + (safeTo - safeFrom) * eased);
    el.textContent = format(value);
    rafId = globalThis.requestAnimationFrame(tick);
  };

  activeCounts.set(el, stop);
  rafId = globalThis.requestAnimationFrame(tick);

  return (): void => {
    stop();
    el.textContent = finalText;
  };
}

export function setProgress(bar: HTMLElement, fraction: number): void {
  if (!bar) return;
  const f = Number.isNaN(fraction) ? 0 : Math.min(1, Math.max(0, fraction));
  if (bar.style) {
    bar.style.transform = `scaleX(${f})`;
  }
  const parent = bar.parentElement;
  if (
    parent &&
    typeof parent.getAttribute === 'function' &&
    parent.getAttribute('role') === 'progressbar' &&
    typeof parent.setAttribute === 'function'
  ) {
    parent.setAttribute('aria-valuenow', String(Math.round(f * 100)));
  }
}