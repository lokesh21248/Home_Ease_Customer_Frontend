import { apiRequest } from './client';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoSearchResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export async function searchAddresses(query: string, token?: string): Promise<GeoSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
  });

  try {
    const raw = await apiRequest<any[]>(
      `/api/v1/geo/search?${params}`,
      token
    );

    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      formattedAddress:
        item.formattedAddress ||
        item.displayName ||
        item.display_name ||
        item.name ||
        '',
      latitude: Number(item.latitude ?? item.lat ?? 0),
      longitude: Number(item.longitude ?? item.lng ?? item.lon ?? 0),
      placeId: item.placeId || item.place_id ? String(item.placeId || item.place_id) : undefined,
    }));
  } catch (e) {
    console.warn('[geoApi] searchAddresses error:', e);
    return [];
  }
}

export async function reverseGeocode(
  point: GeoPoint,
  token?: string
): Promise<GeoSearchResult> {
  const params = new URLSearchParams({
    lat: String(point.latitude),
    lng: String(point.longitude),
  });

  try {
    const raw = await apiRequest<any>(
      `/api/v1/geo/reverse?${params}`,
      token
    );

    return {
      formattedAddress:
        raw.formattedAddress ||
        raw.displayName ||
        raw.display_name ||
        `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
      latitude: Number(raw.latitude ?? raw.lat ?? point.latitude),
      longitude: Number(raw.longitude ?? raw.lng ?? raw.lon ?? point.longitude),
      placeId: raw.placeId || raw.place_id ? String(raw.placeId || raw.place_id) : undefined,
    };
  } catch (e) {
    console.warn('[geoApi] reverseGeocode error:', e);
    return {
      formattedAddress: `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
      latitude: point.latitude,
      longitude: point.longitude,
    };
  }
}
