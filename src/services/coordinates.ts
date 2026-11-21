export type GeoJsonCoordinate = [longitude: number, latitude: number];
export interface LatLngCoordinate {
  latitude: number;
  longitude: number;
}
export type GoogleMapCoordinate = LatLngCoordinate;

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Decodes Google Maps Encoded Polyline format string into an array of { latitude, longitude }.
 * Highly efficient standard polyline algorithm with 1e5 precision factor.
 */
export function decodePolyline(encoded: string): LatLngCoordinate[] {
  return decodePolylineStrict(encoded) ?? [];
}

/**
 * Strict decoder: returns `null` for ANY malformed input (illegal character, truncated varint, latitude
 * without longitude, out-of-range coordinate) instead of silently producing a partial or duplicated line.
 * Points are always (latitude, longitude); the server contract is a precision-1e5 encoded polyline.
 */
export function decodePolylineStrict(encoded: unknown): LatLngCoordinate[] | null {
  if (typeof encoded !== 'string' || encoded.length === 0) return null;
  const points: LatLngCoordinate[] = [];
  const len = encoded.length;
  let index = 0;
  let lat = 0;
  let lng = 0;

  // Reads one zig-zag varint; returns null when truncated or when a character is outside '?'..'~'.
  const readValue = (): number | null => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      if (index >= len) return null;
      b = encoded.charCodeAt(index++) - 63;
      if (b < 0 || b > 63) return null;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (shift > 35) return null;
    } while (b >= 0x20);
    return (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  };

  while (index < len) {
    const dlat = readValue();
    if (dlat === null) return null;
    const dlng = readValue();
    if (dlng === null) return null;
    lat += dlat;
    lng += dlng;
    const finalLat = lat / 1e5;
    const finalLng = lng / 1e5;
    if (!isValidCoordinate(finalLat, finalLng)) return null;
    points.push({ latitude: finalLat, longitude: finalLng });
  }
  return points;
}

/**
 * Normalizes any coordinate array into LatLngCoordinate[] format for react-native-maps.
 * Supports:
 * - LatLngCoordinate[] ({ latitude, longitude })
 * - GeoJSON [longitude, latitude][]
 * - Leaflet [latitude, longitude][]
 * Automatically performs heuristic validation for India/Telangana coordinate bounds (lat ~17, lng ~78).
 */
export function toGoogleMapCoordinates(
  coordinates: unknown,
  format: 'geojson' | 'latlng' = 'geojson',
): LatLngCoordinate[] {
  if (!Array.isArray(coordinates)) return [];
  return coordinates
    .filter((coord) => coord !== null && coord !== undefined)
    .map((coord: any): LatLngCoordinate | null => {
      // 1. Direct LatLngCoordinate object
      if (typeof coord === 'object' && !Array.isArray(coord)) {
        const lat = coord.latitude ?? coord.lat;
        const lng = coord.longitude ?? coord.lng;
        if (isValidCoordinate(lat, lng)) {
          return { latitude: Number(lat), longitude: Number(lng) };
        }
        return null;
      }

      // 2. Pair array [first, second]
      if (Array.isArray(coord) && coord.length >= 2) {
        const first = Number(coord[0]);
        const second = Number(coord[1]);
        if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

        let lat = format === 'geojson' ? second : first;
        let lng = format === 'geojson' ? first : second;

        // Heuristic sanity check: In India, Lat is 8°–37°N and Lng is 68°–98°E.
        // If lat is in longitude range and lng is in latitude range, they are swapped.
        if (lat > 50 && lat <= 180 && lng >= -90 && lng <= 40) {
          const temp = lat;
          lat = lng;
          lng = temp;
        }

        if (isValidCoordinate(lat, lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
      return null;
    })
    .filter((c): c is LatLngCoordinate => c !== null);
}

/**
 * Converts various coordinate representations into standard GeoJSON [longitude, latitude][]
 */
export function toGeoJsonCoordinates(
  coordinates: unknown,
): GeoJsonCoordinate[] | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const result: GeoJsonCoordinate[] = [];
  for (const coord of coordinates) {
    if (!coord) continue;

    // Direct object { latitude, longitude }
    if (typeof coord === 'object' && !Array.isArray(coord)) {
      const lat = Number(coord.latitude ?? coord.lat);
      const lng = Number(coord.longitude ?? coord.lng);
      if (isValidCoordinate(lat, lng)) {
        result.push([lng, lat]);
      }
      continue;
    }

    // Pair array. The documented input contract is [latitude, longitude] (Leaflet / tracking-route order).
    // No order-guessing heuristic: guessing is what made [91, 78.4] "valid" as [lng, lat] and silently
    // mis-ordered real routes. A pair whose first value is not a valid latitude is skipped.
    if (Array.isArray(coord) && coord.length >= 2) {
      const lat = Number(coord[0]);
      const lng = Number(coord[1]);
      if (isValidCoordinate(lat, lng)) {
        result.push([lng, lat]);
      }
    }
  }

  return result.length >= 2 ? result : null;
}

export function isValidGeoJsonRoute(coordinates: unknown): coordinates is GeoJsonCoordinate[] {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates.every((coordinate: unknown) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return false;
      const lng = Number(coordinate[0]);
      const lat = Number(coordinate[1]);
      return isValidCoordinate(lat, lng);
    })
  );
}
