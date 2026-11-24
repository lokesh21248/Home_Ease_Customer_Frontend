/**
 * Pure geometry for the customer live route: where is the worker relative to the road polyline, how far is
 * left, and is the worker still on the suggested road. No React, no network - unit-tested in
 * tests/route-geometry.test.cjs.
 *
 * Every number returned here is derived from the provider's route (geometry, distance, duration). Nothing is
 * estimated from an assumed speed.
 */

import type { LatLngCoordinate } from './coordinates';
import { calculateHaversineDistance } from './trackingMath';

const EARTH_RADIUS_M = 6371008.8;
const DEG = Math.PI / 180;

export interface RouteProgress {
  /** Perpendicular distance from the point to the nearest point on the route (metres). */
  distanceFromRouteMeters: number;
  /** Distance along the route from its start to the projection of the point (metres). */
  alongMeters: number;
  /** Total polyline length (metres). */
  totalMeters: number;
  /** Polyline length still ahead of the projected point (metres). */
  remainingMeters: number;
  /** Index of the polyline segment the point projects onto. */
  segmentIndex: number;
}

/**
 * Projects `point` onto the nearest segment of `path`.
 * Uses a local equirectangular plane centred on the point: error is centimetres over a city-scale leg.
 * If `preferredSegmentIndex` is supplied, searches in a forward window first to avoid jumping
 * across crossed or looped roads.
 */
export function projectOntoRoute(
  point: LatLngCoordinate,
  path: LatLngCoordinate[],
  preferredSegmentIndex?: number,
  offRouteThresholdM = 60,
): RouteProgress | null {
  if (!Array.isArray(path) || path.length < 2) return null;

  const metresPerDegLat = EARTH_RADIUS_M * DEG;
  const metresPerDegLng = metresPerDegLat * Math.cos(point.latitude * DEG);

  const segLen: number[] = new Array(path.length - 1);
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    segLen[i] = calculateHaversineDistance(
      path[i].latitude,
      path[i].longitude,
      path[i + 1].latitude,
      path[i + 1].longitude,
    );
    total += segLen[i];
  }

  const findBestInWindow = (startIdx: number, endIdx: number) => {
    let bestDist = Infinity;
    let bestIndex = startIdx;
    let bestT = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      const ax = (path[i].longitude - point.longitude) * metresPerDegLng;
      const ay = (path[i].latitude - point.latitude) * metresPerDegLat;
      const bx = (path[i + 1].longitude - point.longitude) * metresPerDegLng;
      const by = (path[i + 1].latitude - point.latitude) * metresPerDegLat;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let t = 0;
      if (len2 > 0) {
        t = -(ax * dx + ay * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
      }
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      const dist = Math.hypot(cx, cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        bestT = t;
      }
    }
    return { bestDist, bestIndex, bestT };
  };

  let best = { bestDist: Infinity, bestIndex: 0, bestT: 0 };

  // Windowed search if preferred index is supplied
  if (
    typeof preferredSegmentIndex === 'number' &&
    preferredSegmentIndex >= 0 &&
    preferredSegmentIndex < path.length - 1
  ) {
    const wStart = Math.max(0, preferredSegmentIndex - 1);
    const wEnd = Math.min(path.length - 2, preferredSegmentIndex + 4);
    const windowResult = findBestInWindow(wStart, wEnd);
    if (windowResult.bestDist <= offRouteThresholdM) {
      best = windowResult;
    }
  }

  // Fallback to global search if windowed search failed or was not requested
  if (!Number.isFinite(best.bestDist)) {
    best = findBestInWindow(0, path.length - 2);
  }

  let along = 0;
  for (let i = 0; i < best.bestIndex; i++) along += segLen[i];
  along += best.bestT * segLen[best.bestIndex];

  return {
    distanceFromRouteMeters: best.bestDist,
    alongMeters: along,
    totalMeters: total,
    remainingMeters: Math.max(0, total - along),
    segmentIndex: best.bestIndex,
  };
}

export interface RouteSnapshot {
  polyline: LatLngCoordinate[];
  /** Provider route distance (metres) for the whole polyline. */
  distanceMeters: number;
  /** Provider route duration (seconds, traffic-aware when supplied) for the whole polyline. */
  durationSeconds: number;
}

export type RemainingResult =
  | { status: 'ON_ROUTE'; remainingMeters: number; remainingSeconds: number; distanceFromRouteMeters: number }
  | { status: 'OFF_ROUTE'; distanceFromRouteMeters: number }
  | { status: 'UNAVAILABLE' };

/**
 * Remaining distance/time for the worker on the current route.
 *
 * The provider gives one distance and one duration for the whole route. As the worker advances we scale
 * both by the fraction of the polyline still ahead, so the numbers shrink smoothly between (throttled)
 * provider refreshes while remaining derived from real route data. If the worker has left the road, no
 * number is shown (the caller shows "Rerouting") - we never keep counting down along a road they are not on.
 */
export function computeRemaining(
  route: RouteSnapshot | null,
  worker: LatLngCoordinate | null,
  offRouteMeters = 60,
  preferredSegmentIndex?: number,
): RemainingResult {
  if (!route || !worker) return { status: 'UNAVAILABLE' };
  if (!(route.distanceMeters >= 0) || !(route.durationSeconds >= 0)) return { status: 'UNAVAILABLE' };
  const progress = projectOntoRoute(worker, route.polyline, preferredSegmentIndex, offRouteMeters);
  if (!progress || !(progress.totalMeters > 0)) return { status: 'UNAVAILABLE' };

  if (progress.distanceFromRouteMeters > offRouteMeters) {
    return { status: 'OFF_ROUTE', distanceFromRouteMeters: progress.distanceFromRouteMeters };
  }
  const fraction = Math.min(1, Math.max(0, progress.remainingMeters / progress.totalMeters));
  return {
    status: 'ON_ROUTE',
    remainingMeters: Math.round(fraction * route.distanceMeters),
    remainingSeconds: Math.round(fraction * route.durationSeconds),
    distanceFromRouteMeters: progress.distanceFromRouteMeters,
  };
}

export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Collects the coordinates that must be inside the viewport: worker, destination and the whole route. */
export function collectBoundsPoints(
  worker: LatLngCoordinate | null,
  destination: LatLngCoordinate | null,
  polyline: LatLngCoordinate[],
): LatLngCoordinate[] {
  const pts: LatLngCoordinate[] = [];
  if (worker) pts.push(worker);
  if (destination) pts.push(destination);
  for (const p of polyline) pts.push(p);
  return pts;
}

/**
 * Removes the travelled route segment behind the moving worker while keeping the remaining
 * blue road route terminating at the customer's destination pin.
 *
 * Slices for display only; worker actual GPS is never modified.
 */
export function sliceRemainingRoute(
  path: LatLngCoordinate[],
  worker: LatLngCoordinate | null,
  lastSegmentIndex?: number,
  offRouteMeters = 60,
): { remainingPolyline: LatLngCoordinate[]; progress: RouteProgress | null } {
  if (!Array.isArray(path) || path.length < 2) {
    return { remainingPolyline: Array.isArray(path) ? path : [], progress: null };
  }
  if (!worker) {
    return { remainingPolyline: path, progress: null };
  }

  const progress = projectOntoRoute(worker, path, lastSegmentIndex, offRouteMeters);
  if (!progress || progress.distanceFromRouteMeters > offRouteMeters) {
    // Off-route: keep the route intact so the user sees the original road while reroute is triggered
    return { remainingPolyline: path, progress };
  }

  const segIdx = progress.segmentIndex;
  const pA = path[segIdx];
  const pB = path[segIdx + 1];

  // Compute projected coordinate on segment [pA, pB]
  const metresPerDegLat = EARTH_RADIUS_M * DEG;
  const metresPerDegLng = metresPerDegLat * Math.cos(worker.latitude * DEG);
  const ax = (pA.longitude - worker.longitude) * metresPerDegLng;
  const ay = (pA.latitude - worker.latitude) * metresPerDegLat;
  const bx = (pB.longitude - worker.longitude) * metresPerDegLng;
  const by = (pB.latitude - worker.latitude) * metresPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = -(ax * dx + ay * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }

  const proj: LatLngCoordinate = {
    latitude: pA.latitude + t * (pB.latitude - pA.latitude),
    longitude: pA.longitude + t * (pB.longitude - pA.longitude),
  };

  const remaining: LatLngCoordinate[] = [];
  const distToNext = calculateHaversineDistance(proj.latitude, proj.longitude, pB.latitude, pB.longitude);
  if (distToNext > 3) {
    remaining.push(proj);
  }
  for (let i = segIdx + 1; i < path.length; i++) {
    remaining.push(path[i]);
  }

  // Ensure minimum 2 points for Polyline renderer
  if (remaining.length < 2) {
    remaining.unshift(proj);
  }

  return { remainingPolyline: remaining, progress };
}
