export type Sfx = 'flip' | 'whoosh' | 'correct' | 'wrong';

interface ActivePad {
  room: string;
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  gain: GainNode;
  stopped: boolean;
}

const MASTER_GAIN = 0.15;
const FADE_SEC = 1.5;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let activePad: ActivePad | null = null;

function ensureContext(): { ctx: AudioContext; master: GainNode } | null {
  if (ctx && master) {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    return { ctx, master };
  }
  const AudioCtx = globalThis.AudioContext;
  if (typeof AudioCtx !== 'function') {
    return null;
  }
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
  master.connect(ctx.destination);
  return { ctx, master };
}

function disconnectAll(nodes: AudioNode[]): void {
  for (const node of nodes) {
    node.disconnect();
  }
}

function makeNoiseBuffer(audioCtx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.max(1, Math.ceil(audioCtx.sampleRate * durationSec));
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playFlip(audioCtx: AudioContext, dest: AudioNode): void {
  const now = audioCtx.currentTime;
  const duration = 0.075;

  const src = audioCtx.createBufferSource();
  src.buffer = makeNoiseBuffer(audioCtx, duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(1.4, now);
  filter.frequency.setValueAtTime(1900, now);
  filter.frequency.exponentialRampToValueAtTime(850, now + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.55, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  src.onended = () => disconnectAll([src, filter, gain]);
  src.start(now);
  src.stop(now + duration);
}

function playWhoosh(audioCtx: AudioContext, dest: AudioNode): void {
  const now = audioCtx.currentTime;
  const duration = 0.35;

  const src = audioCtx.createBufferSource();
  src.buffer = makeNoiseBuffer(audioCtx, duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(2.2, now);
  filter.frequency.setValueAtTime(260, now);
  filter.frequency.exponentialRampToValueAtTime(1150, now + 0.16);
  filter.frequency.exponentialRampToValueAtTime(320, now + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.45, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  src.onended = () => disconnectAll([src, filter, gain]);
  src.start(now);
  src.stop(now + duration);
}

function playTone(
  audioCtx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number,
): void {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(dest);

  osc.onended = () => disconnectAll([osc, gain]);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playCorrect(audioCtx: AudioContext, dest: AudioNode): void {
  const now = audioCtx.currentTime;
  playTone(audioCtx, dest, 'sine', 523.25, now, 0.16, 0.45);
  playTone(audioCtx, dest, 'sine', 783.99, now + 0.11, 0.24, 0.5);
}

function playWrong(audioCtx: AudioContext, dest: AudioNode): void {
  const now = audioCtx.currentTime;
  playTone(audioCtx, dest, 'triangle', 311.13, now, 0.16, 0.4);
  playTone(audioCtx, dest, 'triangle', 233.08, now + 0.12, 0.24, 0.4);
}

export function play(sfx: Sfx, on: boolean): void {
  if (!on) {
    return;
  }
  const state = ensureContext();
  if (!state) {
    return;
  }
  switch (sfx) {
    case 'flip':
      playFlip(state.ctx, state.master);
      break;
    case 'whoosh':
      playWhoosh(state.ctx, state.master);
      break;
    case 'correct':
      playCorrect(state.ctx, state.master);
      break;
    case 'wrong':
      playWrong(state.ctx, state.master);
      break;
  }
}

// FNV-1a hash mapped to a low minor/dorian scale so each room gets a deterministic root pitch.
function roomPitch(room: string): number {
  let hash = 2166136261;
  for (let i = 0; i < room.length; i++) {
    hash = Math.imul(hash ^ room.charCodeAt(i), 16777619);
  }
  const semitones = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];
  const step = semitones[(hash >>> 0) % semitones.length];
  return 110 * Math.pow(2, step / 12);
}

function fadeOutPad(pad: ActivePad, audioCtx: AudioContext, immediate: boolean): void {
  if (pad.stopped) {
    return;
  }
  pad.stopped = true;
  const now = audioCtx.currentTime;
  const stopTime = immediate ? now : now + FADE_SEC;

  pad.gain.gain.cancelScheduledValues(now);
  pad.gain.gain.setValueAtTime(pad.gain.gain.value, now);
  pad.gain.gain.linearRampToValueAtTime(0, stopTime);

  let remaining = pad.oscillators.length;
  const onOscEnded = () => {
    remaining -= 1;
    if (remaining <= 0) {
      disconnectAll(pad.nodes);
    }
  };

  for (const osc of pad.oscillators) {
    osc.onended = onOscEnded;
    osc.stop(stopTime);
  }

  if (immediate) {
    disconnectAll(pad.nodes);
  }
}

function startPad(room: string, audioCtx: AudioContext, dest: AudioNode): ActivePad {
  const now = audioCtx.currentTime;
  const baseFreq = roomPitch(room);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(baseFreq * 3, now);
  filter.Q.setValueAtTime(0.7, now);

  const padGain = audioCtx.createGain();
  padGain.gain.setValueAtTime(0.0001, now);
  padGain.gain.linearRampToValueAtTime(0.18, now + FADE_SEC);

  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.18, now);

  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(baseFreq * 0.75, now);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const specs: Array<{ type: OscillatorType; ratio: number; detune: number }> = [
    { type: 'sine', ratio: 1, detune: -6 },
    { type: 'triangle', ratio: 1, detune: 6 },
    { type: 'sine', ratio: 1.5, detune: -3 },
  ];

  const oscillators: OscillatorNode[] = [lfo];
  const nodes: AudioNode[] = [filter, padGain, lfo, lfoGain];

  for (const spec of specs) {
    const osc = audioCtx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(baseFreq * spec.ratio, now);
    osc.detune.setValueAtTime(spec.detune, now);
    osc.connect(filter);
    oscillators.push(osc);
    nodes.push(osc);
  }

  filter.connect(padGain);
  padGain.connect(dest);

  for (const osc of oscillators) {
    osc.start(now);
  }

  return {
    room,
    oscillators,
    nodes,
    gain: padGain,
    stopped: false,
  };
}

export function ambience(room: string | null, on: boolean): void {
  if (!on || room === null) {
    if (activePad && ctx) {
      fadeOutPad(activePad, ctx, false);
      activePad = null;
    }
    return;
  }

  if (activePad && activePad.room === room) {
    return;
  }

  const state = ensureContext();
  if (!state) {
    return;
  }

  if (activePad) {
    fadeOutPad(activePad, state.ctx, false);
  }
  activePad = startPad(room, state.ctx, state.master);
}

export function stopAll(): void {
  if (!ctx) {
    activePad = null;
    master = null;
    return;
  }
  if (activePad) {
    fadeOutPad(activePad, ctx, true);
    activePad = null;
  }
  if (master) {
    master.disconnect();
    master = null;
  }
  const current = ctx;
  ctx = null;
  void current.close();
}