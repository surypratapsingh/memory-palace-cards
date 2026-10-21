import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

class FakeAudioParam {
  value = 0;

  setValueAtTime(value: number, _time: number): this {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value: number, _time: number): this {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number, _time: number): this {
    this.value = value;
    return this;
  }

  cancelScheduledValues(_time: number): this {
    return this;
  }
}

class FakeAudioNode {
  connected = 0;
  disconnected = 0;

  connect(_target: unknown): unknown {
    this.connected += 1;
    return _target;
  }

  disconnect(): void {
    this.disconnected += 1;
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = 'lowpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeScheduledSourceNode extends FakeAudioNode {
  started = false;
  stopped = false;
  stopCalls = 0;
  onended: (() => void) | null = null;

  start(_when?: number): void {
    this.started = true;
  }

  stop(_when?: number): void {
    this.stopped = true;
    this.stopCalls += 1;
    if (this.onended) {
      this.onended();
    }
  }
}

class FakeOscillatorNode extends FakeScheduledSourceNode {
  type: OscillatorType = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
}

class FakeAudioBufferSourceNode extends FakeScheduledSourceNode {
  buffer: unknown = null;
}

class FakeAudioBuffer {
  private channelData: Float32Array;

  constructor(length: number) {
    this.channelData = new Float32Array(length);
  }

  getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static oscillators: FakeOscillatorNode[] = [];
  static bufferSources: FakeAudioBufferSourceNode[] = [];
  static allNodes: FakeAudioNode[] = [];

  static reset(): void {
    FakeAudioContext.instances = [];
    FakeAudioContext.oscillators = [];
    FakeAudioContext.bufferSources = [];
    FakeAudioContext.allNodes = [];
  }

  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  closed = false;
  destination = new FakeAudioNode();

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode();
    FakeAudioContext.allNodes.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const node = new FakeBiquadFilterNode();
    FakeAudioContext.allNodes.push(node);
    return node;
  }

  createOscillator(): FakeOscillatorNode {
    const node = new FakeOscillatorNode();
    FakeAudioContext.oscillators.push(node);
    FakeAudioContext.allNodes.push(node);
    return node;
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    const node = new FakeAudioBufferSourceNode();
    FakeAudioContext.bufferSources.push(node);
    FakeAudioContext.allNodes.push(node);
    return node;
  }

  createBuffer(_channels: number, length: number, _sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(length);
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.closed = true;
    this.state = 'closed';
  }
}

(globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext =
  FakeAudioContext;

const { play, ambience, stopAll } = await import('./sound.ts');
const contextsConstructedAtImport = FakeAudioContext.instances.length;

beforeEach(() => {
  stopAll();
  FakeAudioContext.reset();
  (globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext =
    FakeAudioContext;
});

afterEach(() => {
  stopAll();
});

test('1. play() and ambience() with on=false never construct an AudioContext', () => {
  play('flip', false);
  play('whoosh', false);
  play('correct', false);
  play('wrong', false);
  ambience('Library', false);
  ambience(null, false);

  assert.equal(FakeAudioContext.instances.length, 0);
});

test('2. importing the module constructs no AudioContext', () => {
  assert.equal(contextsConstructedAtImport, 0);
});

test("3. play('flip', true) constructs exactly one AudioContext; a second play reuses it", () => {
  play('flip', true);
  assert.equal(FakeAudioContext.instances.length, 1);

  const firstContext = FakeAudioContext.instances[0];
  play('whoosh', true);
  assert.equal(FakeAudioContext.instances.length, 1);
  assert.equal(FakeAudioContext.instances[0], firstContext);
});

test('4. every effect stops all of its oscillator and buffer source nodes', () => {
  const effects = ['flip', 'whoosh', 'correct', 'wrong'] as const;

  for (const sfx of effects) {
    FakeAudioContext.oscillators = [];
    FakeAudioContext.bufferSources = [];

    play(sfx, true);

    const sources = [
      ...FakeAudioContext.oscillators,
      ...FakeAudioContext.bufferSources,
    ];
    assert.ok(sources.length > 0, `Expected ${sfx} to create at least one source node`);
    for (const src of sources) {
      assert.equal(src.started, true, `Expected source in ${sfx} to be started`);
      assert.equal(src.stopped, true, `Expected source in ${sfx} to have stop() called`);
    }
  }
});

test("5. ambience('Library', true) twice creates oscillators only once; ambience(null, true) stops them", () => {
  ambience('Library', true);
  const countAfterFirst = FakeAudioContext.oscillators.length;
  assert.ok(countAfterFirst > 0);
  for (const osc of FakeAudioContext.oscillators) {
    assert.equal(osc.stopped, false);
  }

  ambience('Library', true);
  assert.equal(FakeAudioContext.oscillators.length, countAfterFirst);

  ambience(null, true);
  for (const osc of FakeAudioContext.oscillators) {
    assert.equal(osc.stopped, true);
  }
});

test('6. stopAll() closes the context, and the next play(..., true) creates a new one', () => {
  play('correct', true);
  assert.equal(FakeAudioContext.instances.length, 1);
  const firstCtx = FakeAudioContext.instances[0];
  assert.equal(firstCtx.closed, false);

  stopAll();
  assert.equal(firstCtx.closed, true);

  play('wrong', true);
  assert.equal(FakeAudioContext.instances.length, 2);
  assert.notEqual(FakeAudioContext.instances[1], firstCtx);
});

test('7. with globalThis.AudioContext undefined, every function runs without throwing', () => {
  (globalThis as unknown as { AudioContext: undefined }).AudioContext = undefined;

  assert.doesNotThrow(() => {
    play('flip', true);
    play('whoosh', true);
    play('correct', true);
    play('wrong', true);
    ambience('Dungeon', true);
    ambience(null, true);
    stopAll();
  });
});