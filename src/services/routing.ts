import { ApiError, trackingApi, type BookingRouteReason, type TrackingRouteResponse } from '../api/client';
import {
  decodePolylineStrict,
  isValidCoordinate,
  isValidGeoJsonRoute,
  type GeoJsonCoordinate,
  type LatLngCoordinate,
} from './coordinates';
import { classifyRouteFailure, type RouteFailure } from './routePolicy';
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
  polylineCoordinates: LatLngCoordinate[];
  polyline?: string;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

/** A booking route plus the facts the live-tracking UI needs. */
export interface BookingRoute extends RouteResult {
  /** Epoch ms at which the provider route was computed. */
  calculatedAtMs: number;
  /** Where the route starts (the worker's GPS fix it was computed from). */
  origin: LatLngCoordinate;
  /** The booking's persisted service address, as echoed by the server. */
  destination: LatLngCoordinate;
  /** The server served this from its cache (no new provider call). */
  cached: boolean;
}

/** Thrown by fetchBookingRoute; carries a classified, user-safe failure. */
export class RouteRequestError extends Error {
  readonly failure: RouteFailure;

  constructor(failure: RouteFailure) {
    super(failure.message);
    this.name = 'RouteRequestError';
    this.failure = failure;
  }
}

function toRouteResult(
  polyline: string,
  points: LatLngCoordinate[],
  distanceMeters: number,
  durationSeconds: number,
  distanceText?: string,
  durationText?: string,
): RouteResult | null {
  const geoJson: GeoJsonCoordinate[] = points.map((p) => [p.longitude, p.latitude]);
  if (!isValidGeoJsonRoute(geoJson)) return null;
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return null;
  const meters = Math.round(distanceMeters);
  const seconds = Math.round(durationSeconds);
  return {
    coordinates: geoJson,
    polylineCoordinates: points,
    polyline,
    distanceMeters: meters,
    durationSeconds: seconds,
    distanceText: distanceText || formatDistance(meters),
    durationText: durationText || formatDuration(seconds),
  };
}

/**
 * Customer live route: asks the server for the road route from the assigned worker's latest GPS to the
 * booking's PERSISTED service address. The request carries no coordinates, so nothing on the device (customer
 * GPS, pincode centroid, default city) can ever become the destination.
 *
 * Throws RouteRequestError (with a classified failure) for every problem. There is deliberately no fallback
 * that fabricates a line, distance or ETA: if the server cannot give a real route, the UI says so.
 */
export async function fetchBookingRoute(
  bookingId: string,
  reason: BookingRouteReason,
  signal?: AbortSignal,
): Promise<BookingRoute> {
  let response;
  try {
    response = await trackingApi.getBookingRoute(bookingId, reason, signal);
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    if (error instanceof ApiError) {
      throw new RouteRequestError(
        classifyRouteFailure({
          code: error.code,
          status: error.status,
          retryAfterSeconds: error.retryAfterSeconds,
        }),
      );
    }
    // fetch() rejects with a TypeError when the network is unreachable
    throw new RouteRequestError(classifyRouteFailure({ network: true }));
  }

  const points = decodePolylineStrict(response.polyline);
  const base =
    points && points.length >= 2
      ? toRouteResult(response.polyline, points, response.distanceMeters, response.durationSeconds)
      : null;
  const origin = { latitude: response.origin?.lat, longitude: response.origin?.lng };
  const destination = { latitude: response.destination?.lat, longitude: response.destination?.lng };

  if (
    !base ||
    response.found === false ||
    !isValidCoordinate(origin.latitude, origin.longitude) ||
    !isValidCoordinate(destination.latitude, destination.longitude)
  ) {
    // The server answered 200 with something we cannot safely draw. Treat as a provider problem, not as data.
    throw new RouteRequestError(classifyRouteFailure({ code: 'ROUTING_PROVIDER_ERROR' }));
  }

  return {
    ...base,
    calculatedAtMs: Number.isFinite(response.calculatedAtEpochMs) ? response.calculatedAtEpochMs : Date.now(),
    origin,
    destination,
    cached: Boolean(response.cached),
  };
}

/**
 * Coordinate-to-coordinate route used ONLY by the partner (worker) navigation screen, which genuinely has
 * its own GPS origin and a destination it was handed. The customer tracking screen must use
 * fetchBookingRoute() instead.
 *
 * Returns null when the server has no usable real route. Distance and duration come only from the server:
 * a missing value makes the route unusable rather than being estimated.
 */
export async function fetchDrivingRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  if (!isValidCoordinate(startLat, startLng) || !isValidCoordinate(destLat, destLng)) {
    return null;
  }

  let response: TrackingRouteResponse | null;
  try {
    response = await trackingApi.getRoute(startLat, startLng, destLat, destLng, signal);
  } catch {
    return null;
  }
  if (!response || response.found === false) return null;

  let points: LatLngCoordinate[] | null = null;
  // 1. Encoded polyline: unambiguous and highest fidelity.
  if (typeof response.polyline === 'string' && response.polyline.length > 0) {
    points = decodePolylineStrict(response.polyline);
  }
  // 2. leafletCoordinates are [latitude, longitude] by definition.
  if ((!points || points.length < 2) && Array.isArray(response.leafletCoordinates)) {
    points = response.leafletCoordinates
      .filter((pt) => Array.isArray(pt) && pt.length >= 2)
      .map(([lat, lng]) => ({ latitude: Number(lat), longitude: Number(lng) }))
      .filter((pt) => isValidCoordinate(pt.latitude, pt.longitude));
  }
  // 3. `coordinates` from the tracking service are GeoJSON [longitude, latitude] by definition.
  if ((!points || points.length < 2) && Array.isArray(response.coordinates)) {
    points = (response.coordinates as unknown[])
      .filter((pt): pt is [number, number] => Array.isArray(pt) && pt.length >= 2)
      .map(([lng, lat]) => ({ latitude: Number(lat), longitude: Number(lng) }))
      .filter((pt) => isValidCoordinate(pt.latitude, pt.longitude));
  }
  if (!points || points.length < 2) return null;

  const distanceMeters =
    typeof response.distanceMeters === 'number'
      ? response.distanceMeters
      : typeof response.distanceKm === 'number'
        ? response.distanceKm * 1000
        : NaN;
  const durationSeconds =
    typeof response.durationSeconds === 'number'
      ? response.durationSeconds
      : typeof response.durationMin === 'number'
        ? response.durationMin * 60
        : NaN;

  return toRouteResult(
    response.polyline ?? '',
    points,
    distanceMeters,
    durationSeconds,
    response.distanceText,
    response.durationText,
  );
}
