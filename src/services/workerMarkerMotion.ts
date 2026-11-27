/**
 * Pure worker-marker presentation settings. These never modify authenticated GPS data.
 * Small full-body walking woman (Snabbit-scale, not an avatar or a full-screen character).
 */
export const WORKER_SYMBOL_WIDTH = 30;
export const WORKER_SYMBOL_HEIGHT = 48;
export const WORKER_MARKER_JITTER_METERS = 1.5;
export const WORKER_GPS_EXPECTED_INTERVAL_MS = 7_000;

/**
 * Native coordinate animation should finish just before the next real GPS update.
 * Do not animate forever / extrapolate beyond the last accepted fix.
 */
export function smoothWorkerMotionDurationMs(gpsGapMs?: number | null): number {
  const gap = typeof gpsGapMs === 'number' && Number.isFinite(gpsGapMs) && gpsGapMs > 0
    ? gpsGapMs
    : WORKER_GPS_EXPECTED_INTERVAL_MS;
  return Math.max(500, Math.min(6_500, Math.round(gap * 0.92)));
}
