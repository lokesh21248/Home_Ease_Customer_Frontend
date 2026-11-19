import { trackingApi, type TrackingRouteResponse } from '../api/client';
import {
  decodePolyline,
  isValidCoordinate,
  isValidGeoJsonRoute,
  toGoogleMapCoordinates,
  type GeoJsonCoordinate,
  type LatLngCoordinate,
} from './coordinates';
import {
  calculateHaversineDistance,
  formatDistance,
  formatDuration,
} from './trackingMath';

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
  polylineCoordinates: LatLngCoordinate[];
  polyline?: string;
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
  bookingId?: string,
): Promise<RouteResult | null> {
  if (
    !isValidCoordinate(startLat, startLng) ||
    !isValidCoordinate(destLat, destLng)
  ) {
    return null;
  }

  let response: TrackingRouteResponse | null = null;

  // 1. If bookingId provided, first attempt booking-specific route endpoint
  if (bookingId) {
    try {
      response = await trackingApi.getBookingRoute(bookingId, destLat, destLng, signal);
    } catch {
      // Continue to coordinate-based route endpoint
    }
  }

  // 2. Fetch using direct coordinate route endpoint
  if (!response || response.found === false) {
    try {
      response = await trackingApi.getRoute(
        startLat,
        startLng,
        destLat,
        destLng,
        signal,
      );
    } catch {
      return null;
    }
  }

  if (!response || response.found === false) {
    return null;
  }

  // 3. Extract road polyline points
  let polylineCoords: LatLngCoordinate[] = [];

  // 3a. Decode Google Routes encoded polyline string (highest fidelity road geometry)
  if (response.polyline && typeof response.polyline === 'string' && response.polyline.trim().length > 0) {
    polylineCoords = decodePolyline(response.polyline);
  }

  // 3b. Fallback: Leaflet coordinates [[latitude, longitude], ...]
  if (polylineCoords.length < 2 && Array.isArray(response.leafletCoordinates)) {
    polylineCoords = response.leafletCoordinates
      .filter((pt) => Array.isArray(pt) && pt.length >= 2)
      .map(([lat, lng]) => ({ latitude: Number(lat), longitude: Number(lng) }))
      .filter((pt) => isValidCoordinate(pt.latitude, pt.longitude));
  }

  // 3c. Fallback: GeoJSON coordinates [[longitude, latitude], ...]
  if (polylineCoords.length < 2 && Array.isArray(response.coordinates)) {
    polylineCoords = toGoogleMapCoordinates(response.coordinates, 'geojson');
  }

  // If no polyline points could be derived, cannot render route
  if (polylineCoords.length < 2) {
    return null;
  }

  // Generate GeoJSON [lng, lat][] representation
  const geoJsonCoords: GeoJsonCoordinate[] = polylineCoords.map((pt) => [
    pt.longitude,
    pt.latitude,
  ]);

  if (!isValidGeoJsonRoute(geoJsonCoords)) {
    return null;
  }

  // Distance parsing (meters)
  let distanceMeters = NaN;
  if (typeof response.distanceMeters === 'number' && Number.isFinite(response.distanceMeters)) {
    distanceMeters = Math.round(response.distanceMeters);
  } else if (typeof response.distanceKm === 'number' && Number.isFinite(response.distanceKm)) {
    distanceMeters = Math.round(response.distanceKm * 1000);
  } else {
    distanceMeters = Math.round(calculateHaversineDistance(startLat, startLng, destLat, destLng) * 1.3);
  }

  // Duration parsing (seconds)
  let durationSeconds = NaN;
  if (typeof response.durationSeconds === 'number' && Number.isFinite(response.durationSeconds)) {
    durationSeconds = Math.round(response.durationSeconds);
  } else if (typeof response.durationMin === 'number' && Number.isFinite(response.durationMin)) {
    durationSeconds = Math.round(response.durationMin * 60);
  } else {
    // Urban driving estimate: ~25 km/h (~6.94 m/s)
    durationSeconds = Math.max(60, Math.round(distanceMeters / 6.94));
  }

  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return null;
  }

  return {
    coordinates: geoJsonCoords,
    polylineCoordinates: polylineCoords,
    polyline: response.polyline,
    distanceMeters,
    durationSeconds,
    distanceText: response.distanceText || formatDistance(distanceMeters),
    durationText: response.durationText || formatDuration(durationSeconds),
  };
}
