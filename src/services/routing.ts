import { trackingApi } from '../api/client';
import {
  isValidCoordinate,
  isValidGeoJsonRoute,
  toGeoJsonCoordinates,
  type GeoJsonCoordinate,
} from './coordinates';
import { formatDistance, formatDuration } from './trackingMath';

export {
  calculateBearing,
  calculateHaversineDistance,
  formatDistance,
  formatDuration,
  shouldRecalculateRoute,
} from './trackingMath';

export interface RouteCoordinate {
  lng: number;
  lat: number;
}

export interface RouteResult {
  coordinates: GeoJsonCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

export async function fetchDrivingRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  if (
    !isValidCoordinate(startLat, startLng) ||
    !isValidCoordinate(destLat, destLng)
  ) {
    return null;
  }

  const response = await trackingApi.getRoute(
    startLat,
    startLng,
    destLat,
    destLng,
    signal,
  );
  const coordinates = toGeoJsonCoordinates(response?.coordinates);
  const distanceMeters =
    typeof response?.distanceKm === 'number' ? response.distanceKm * 1000 : NaN;
  const durationSeconds =
    typeof response?.durationMin === 'number' ? response.durationMin * 60 : NaN;
  if (
    !response ||
    !coordinates ||
    !isValidGeoJsonRoute(coordinates) ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0
  ) {
    return null;
  }

  return {
    coordinates,
    distanceMeters,
    durationSeconds,
    distanceText: formatDistance(distanceMeters),
    durationText: formatDuration(durationSeconds),
  };
}
