import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDeviceProfile,
  createFrameMonitor,
  type DeviceProfile,
} from './perf.ts';

test('detectDeviceProfile: detects low-end phones and caps pixel ratio and shadow map size', () => {
  // Budget phone: 4 cores, Android mobile user agent, 3 GB RAM
  const lowPhone = detectDeviceProfile(
    {
      hardwareConcurrency: 4,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 3a) AppleWebKit/537.36 Mobile Safari/537.36',
      // @ts-expect-error deviceMemory is non-standard
      deviceMemory: 3,
    },
    { devicePixelRatio: 2.75, innerWidth: 393 },
  );

  assert.equal(lowPhone.tier, 'low');
  assert.equal(lowPhone.maxPixelRatio, 1.0, 'Low-end phone max DPR should be capped at 1.0');
  assert.equal(lowPhone.shadowMapSize, 1024, 'Low-end phone shadow map should be 1024 to save GPU VRAM');
  assert.equal(lowPhone.targetFps, 30);
  assert.equal(lowPhone.cullDistanceX, 20);

  // Desktop with 2 cores (low-end PC / Chromebook)
  const lowPC = detectDeviceProfile({
    hardwareConcurrency: 2,
    userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)',
  });
  assert.equal(lowPC.tier, 'low');
  assert.equal(lowPC.maxPixelRatio, 1.0);
  assert.equal(lowPC.shadowMapSize, 1024);
});

test('detectDeviceProfile: identifies medium tier mobile and desktop devices', () => {
  // Mid-range phone: 8 cores, mobile user agent, 6 GB RAM
  const midPhone = detectDeviceProfile(
    {
      hardwareConcurrency: 8,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) Mobile Safari/537.36',
      // @ts-expect-error deviceMemory is non-standard
      deviceMemory: 6,
    },
    { devicePixelRatio: 2.5, innerWidth: 412 },
  );

  assert.equal(midPhone.tier, 'medium');
  assert.equal(midPhone.maxPixelRatio, 1.5, 'Mid phone should cap DPR at 1.5');
  assert.equal(midPhone.shadowMapSize, 1024);
  assert.equal(midPhone.targetFps, 60);
  assert.equal(midPhone.cullDistanceX, 25);

  // Mid desktop: 6 cores
  const midDesktop = detectDeviceProfile({
    hardwareConcurrency: 6,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  });
  assert.equal(midDesktop.tier, 'medium');
  assert.equal(midDesktop.maxPixelRatio, 1.5);
});

test('detectDeviceProfile: high tier desktop receives full fidelity', () => {
  const highPC = detectDeviceProfile(
    {
      hardwareConcurrency: 16,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      // @ts-expect-error deviceMemory is non-standard
      deviceMemory: 16,
    },
    { devicePixelRatio: 2.0, innerWidth: 1920 },
  );

  assert.equal(highPC.tier, 'high');
  assert.equal(highPC.maxPixelRatio, 2.0);
  assert.equal(highPC.shadowMapSize, 2048);
  assert.equal(highPC.targetFps, 60);
  assert.equal(highPC.cullDistanceX, 35);
});

test('createFrameMonitor: records frames, calculates stats and tracks dropped frames', () => {
  const monitor = createFrameMonitor(60, 20);

  // Initial stats
  const init = monitor.getStats();
  assert.equal(init.avgFrameTimeMs, 0);
  assert.equal(init.droppedFrames, 0);
  assert.equal(init.totalFrames, 0);
  assert.equal(init.fps, 60);

  // Ignore invalid inputs
  monitor.recordFrame(0);
  monitor.recordFrame(-10);
  monitor.recordFrame(NaN);
  monitor.recordFrame(Infinity);
  assert.equal(monitor.getStats().totalFrames, 0);

  // Record 15 smooth 16.6ms frames
  for (let i = 0; i < 15; i++) {
    monitor.recordFrame(16.6);
  }
  let stats = monitor.getStats();
  assert.equal(stats.totalFrames, 15);
  assert.equal(stats.droppedFrames, 0);
  assert.equal(stats.avgFrameTimeMs, 16.6);
  assert.equal(stats.fps, 60);
  assert.equal(monitor.isUnderperforming(), false);

  // Record 5 slow frames (35ms > 25ms drop threshold)
  for (let i = 0; i < 5; i++) {
    monitor.recordFrame(35.0);
  }
  stats = monitor.getStats();
  assert.equal(stats.totalFrames, 20);
  assert.equal(stats.droppedFrames, 5);
  assert.ok(stats.avgFrameTimeMs > 20.0);
  assert.equal(stats.p95FrameTimeMs, 35.0);
});

test('createFrameMonitor: dynamically adapts recommended pixel ratio under load', () => {
  const monitor = createFrameMonitor(60, 20);
  const profile: DeviceProfile = {
    tier: 'low',
    maxPixelRatio: 1.0,
    shadowMapSize: 1024,
    targetFps: 30,
    cullDistanceX: 20,
  };

  // Less than 10 frames: should return current DPR unchanged
  for (let i = 0; i < 5; i++) {
    monitor.recordFrame(45.0);
  }
  assert.equal(monitor.getRecommendedPixelRatio(1.0, profile), 1.0);

  // Sustained heavy load (avg frame time 35ms > 22.5ms threshold)
  for (let i = 0; i < 15; i++) {
    monitor.recordFrame(35.0);
  }
  assert.equal(monitor.isUnderperforming(), true);

  // Recommend scaling down DPR by 0.25
  const scaledDown = monitor.getRecommendedPixelRatio(1.0, profile);
  assert.equal(scaledDown, 0.75);

  // Should not scale below minimum clamp 0.75
  const atMin = monitor.getRecommendedPixelRatio(0.75, profile);
  assert.equal(atMin, 0.75);

  // Reset and record fast frames (< 12.5ms)
  monitor.reset();
  assert.equal(monitor.getStats().totalFrames, 0);
  for (let i = 0; i < 20; i++) {
    monitor.recordFrame(10.0);
  }
  assert.equal(monitor.isUnderperforming(), false);

  // Recommend scaling back up towards profile cap
  const scaledUp = monitor.getRecommendedPixelRatio(0.75, profile);
  assert.equal(scaledUp, 1.0);

  // Will not exceed profile maxPixelRatio
  const atCap = monitor.getRecommendedPixelRatio(1.0, profile);
  assert.equal(atCap, 1.0);
});
