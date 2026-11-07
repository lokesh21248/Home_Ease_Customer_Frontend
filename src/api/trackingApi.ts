import { apiRequest } from './client';
import type { GeoPoint } from './geoApi';

const TRACKING_API_URL =
  process.env.EXPO_PUBLIC_TRACKING_API_URL || 'http://3.108.55.219/api/v1';

export interface ProviderLocation extends GeoPoint {
  bookingId?: string;
  workerId?: string;
  bearing?: number;
  speed?: number;
  accuracy?: number;
  timestamp?: number;
}

export interface TrackingRoute {
  provider: string;
  found: boolean;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  polyline?: string;
  coordinates?: { latitude: number; longitude: number }[];
}

export async function getActiveLocation(
  bookingId: string,
  token?: string
): Promise<ProviderLocation> {
  const params = new URLSearchParams({ bookingId });

  try {
    // 1. Try tracking microservice latest endpoint
    const raw = await apiRequest<any>(
      `${TRACKING_API_URL}/tracking/latest/${encodeURIComponent(bookingId)}`,
      token
    );

    const lat = raw?.workerLocation?.lat ?? raw?.latitude ?? raw?.lat ?? 0;
    const lng = raw?.workerLocation?.lng ?? raw?.longitude ?? raw?.lng ?? 0;

    return {
      bookingId,
      workerId: raw?.workerId,
      latitude: Number(lat),
      longitude: Number(lng),
      bearing: Number(raw?.bearing ?? 0),
      speed: raw?.speed != null ? Number(raw.speed) : undefined,
      accuracy: raw?.accuracy != null ? Number(raw.accuracy) : undefined,
      timestamp: raw?.timestamp ? new Date(raw.timestamp).getTime() : Date.now(),
    };
  } catch {
    // 2. Fallback to active-location query endpoint
    const raw = await apiRequest<any>(
      `${TRACKING_API_URL}/tracking/active-location?${params}`,
      token
    );

    const lat = raw?.latitude ?? raw?.lat ?? raw?.workerLocation?.lat ?? 0;
    const lng = raw?.longitude ?? raw?.lng ?? raw?.workerLocation?.lng ?? 0;

    return {
      bookingId,
      workerId: raw?.workerId,
      latitude: Number(lat),
      longitude: Number(lng),
      bearing: Number(raw?.bearing ?? 0),
      speed: raw?.speed != null ? Number(raw.speed) : undefined,
      accuracy: raw?.accuracy != null ? Number(raw.accuracy) : undefined,
      timestamp: raw?.timestamp ? new Date(raw.timestamp).getTime() : Date.now(),
    };
  }
}

export async function getTrackingDistance(
  bookingId: string,
  customer: GeoPoint,
  token?: string
) {
  const params = new URLSearchParams({
    bookingId,
    customerLat: String(customer.latitude),
    customerLng: String(customer.longitude),
  });

  return apiRequest<{
    distanceMeters?: number;
    distanceText?: string;
    durationSeconds?: number;
    durationText?: string;
  }>(`${TRACKING_API_URL}/tracking/distance?${params}`, token);
}

export async function getTrackingRoute(
  start: GeoPoint,
  destination: GeoPoint,
  token?: string
): Promise<TrackingRoute> {
  const params = new URLSearchParams({
    startLat: String(start.latitude),
    startLng: String(start.longitude),
    destLat: String(destination.latitude),
    destLng: String(destination.longitude),
  });

  const result = await apiRequest<any>(
    `${TRACKING_API_URL}/tracking/route?${params}`,
    token
  );

  const rawCoords: [number, number][] = result?.coordinates ?? [];

  // Convert [lat, lng] or [lng, lat] pairs to { latitude, longitude }[]
  const coordinates = rawCoords.map((pair: [number, number]) => {
    return {
      latitude: pair[0],
      longitude: pair[1],
    };
  });

  const distanceMeters =
    result?.distanceMeters ??
    (typeof result?.distanceKm === 'number' ? result.distanceKm * 1000 : 0);

  const durationSeconds =
    result?.durationSeconds ??
    (typeof result?.durationMin === 'number' ? result.durationMin * 60 : 0);

  return {
    provider: result?.provider || 'Google Maps',
    found: Boolean(result?.found ?? true),
    distanceMeters,
    durationSeconds,
    distanceText: result?.distanceText || `${(distanceMeters / 1000).toFixed(1)} km`,
    durationText: result?.durationText || `${Math.round(durationSeconds / 60)} mins`,
    polyline: result?.polyline,
    coordinates,
  };
}
