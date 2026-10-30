import { isValidCoordinate } from './coordinates';

export interface RouteRequestAnchor {
  lat: number;
  lng: number;
  requestedAt: number;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return 'Unavailable';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Unavailable';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371e3;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function shouldRecalculateRoute(
  previous: RouteRequestAnchor | null,
  next: { lat: number; lng: number },
  now: number,
  movementThresholdMeters = 75,
  maxRouteAgeMs = 45_000,
): boolean {
  if (!isValidCoordinate(next.lat, next.lng)) return false;
  if (!previous) return true;
  const age = now - previous.requestedAt;
  return (
    age >= maxRouteAgeMs ||
    calculateHaversineDistance(previous.lat, previous.lng, next.lat, next.lng) >=
      movementThresholdMeters
  );
}

export function parseLocationTimestamp(value?: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isAcceptableLocationTimestamp(
  incoming: number,
  previous: number | null,
  now = Date.now(),
): boolean {
  return (
    Number.isFinite(incoming) &&
    incoming <= now + 60_000 &&
    (previous === null || incoming > previous)
  );
}
