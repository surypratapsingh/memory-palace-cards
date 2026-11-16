// Performance and device profiling for mobile and low-end devices.
// Manages device tier detection, frame time monitoring, and adaptive rendering parameters.

export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceProfile {
  tier: DeviceTier;
  maxPixelRatio: number;
  shadowMapSize: number;
  targetFps: number;
  cullDistanceX: number;
}

export interface FrameStats {
  avgFrameTimeMs: number;
  p95FrameTimeMs: number;
  fps: number;
  droppedFrames: number;
  totalFrames: number;
}

export interface FrameMonitor {
  recordFrame(deltaMs: number): void;
  getStats(): FrameStats;
  isUnderperforming(): boolean;
  getRecommendedPixelRatio(currentDpr: number, profile: DeviceProfile): number;
  reset(): void;
}

/**
 * Detects device hardware tier to tailor graphics workload for low-end phones.
 */
export function detectDeviceProfile(
  nav?: Partial<Navigator>,
  win?: { devicePixelRatio?: number; innerWidth?: number },
): DeviceProfile {
  const n = nav ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);

  const concurrency = typeof n?.hardwareConcurrency === 'number' ? n.hardwareConcurrency : 4;
  const memory = (n as { deviceMemory?: number } | undefined)?.deviceMemory;
  const userAgent = n?.userAgent ?? '';
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
    (typeof w?.innerWidth === 'number' && w.innerWidth > 0 && w.innerWidth < 768);

  // Low-end conditions:
  // - 4 or fewer CPU cores on mobile
  // - <= 4 GB RAM
  // - Low concurrency or mobile device with low hardware
  const isLowEnd =
    (typeof memory === 'number' && memory <= 4) ||
    (isMobile && concurrency <= 4) ||
    concurrency <= 2;

  if (isLowEnd) {
    return {
      tier: 'low',
      maxPixelRatio: 1.0,
      shadowMapSize: 1024,
      targetFps: 30,
      cullDistanceX: 20,
    };
  }

  // Medium tier: mobile with > 4 cores, or desktop with 4-6 cores
  const isMedium = isMobile || concurrency <= 6;
  if (isMedium) {
    return {
      tier: 'medium',
      maxPixelRatio: 1.5,
      shadowMapSize: 1024,
      targetFps: 60,
      cullDistanceX: 25,
    };
  }

  return {
    tier: 'high',
    maxPixelRatio: 2.0,
    shadowMapSize: 2048,
    targetFps: 60,
    cullDistanceX: 35,
  };
}

/**
 * Monitors real-time frame times and provides adaptive scaling recommendations.
 */
export function createFrameMonitor(
  targetFps = 60,
  windowSize = 30,
): FrameMonitor {
  const targetFrameMs = 1000 / targetFps;
  const dropThresholdMs = targetFrameMs * 1.5;
  const history: number[] = [];
  let totalFrames = 0;
  let droppedFrames = 0;

  return {
    recordFrame(deltaMs: number): void {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
      totalFrames++;
      if (deltaMs > dropThresholdMs) {
        droppedFrames++;
      }
      history.push(deltaMs);
      if (history.length > windowSize) {
        history.shift();
      }
    },

    getStats(): FrameStats {
      if (history.length === 0) {
        return {
          avgFrameTimeMs: 0,
          p95FrameTimeMs: 0,
          fps: targetFps,
          droppedFrames,
          totalFrames,
        };
      }

      const sum = history.reduce((acc, v) => acc + v, 0);
      const avg = sum / history.length;
      const sorted = [...history].sort((a, b) => a - b);
      const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      const p95 = sorted[p95Idx] ?? avg;
      const fps = avg > 0 ? Math.round(1000 / avg) : targetFps;

      return {
        avgFrameTimeMs: Math.round(avg * 10) / 10,
        p95FrameTimeMs: Math.round(p95 * 10) / 10,
        fps,
        droppedFrames,
        totalFrames,
      };
    },

    isUnderperforming(): boolean {
      if (history.length < 10) return false;
      const stats = this.getStats();
      // Underperforming if average frame time exceeds 1.35x target frame time
      return stats.avgFrameTimeMs > targetFrameMs * 1.35;
    },

    getRecommendedPixelRatio(currentDpr: number, profile: DeviceProfile): number {
      if (history.length < 10) return currentDpr;
      const stats = this.getStats();

      // If consistently exceeding frame budget, throttle down DPR
      if (stats.avgFrameTimeMs > targetFrameMs * 1.35) {
        return Math.max(0.75, Math.round((currentDpr - 0.25) * 100) / 100);
      }

      // If performing very smoothly with room to spare, allow scaling back up to profile cap
      if (stats.avgFrameTimeMs < targetFrameMs * 0.75 && currentDpr < profile.maxPixelRatio) {
        return Math.min(profile.maxPixelRatio, Math.round((currentDpr + 0.25) * 100) / 100);
      }

      return currentDpr;
    },

    reset(): void {
      history.length = 0;
      totalFrames = 0;
      droppedFrames = 0;
    },
  };
}
