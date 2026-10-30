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

export function toGoogleMapCoordinates(
  coordinates: GeoJsonCoordinate[] | [number, number][],
  format: 'geojson' | 'latlng' = 'geojson',
): LatLngCoordinate[] {
  if (!Array.isArray(coordinates)) return [];
  return coordinates
    .filter(
      (coord) =>
        Array.isArray(coord) &&
        typeof coord[0] === 'number' &&
        typeof coord[1] === 'number',
    )
    .map(([first, second]) => {
      const lat = format === 'geojson' ? second : first;
      const lng = format === 'geojson' ? first : second;
      return { latitude: lat, longitude: lng };
    })
    .filter((c) => isValidCoordinate(c.latitude, c.longitude));
}

export function toGeoJsonCoordinates(
  coordinates: unknown,
): GeoJsonCoordinate[] | null {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every(
      (coordinate: unknown) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        typeof coordinate[0] === 'number' &&
        typeof coordinate[1] === 'number' &&
        isValidCoordinate(coordinate[0], coordinate[1]),
    )
  ) {
    return null;
  }
  return coordinates.map(
    ([latitude, longitude]): GeoJsonCoordinate => [longitude, latitude],
  );
}

export function isValidGeoJsonRoute(coordinates: unknown): coordinates is GeoJsonCoordinate[] {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates.every((coordinate: unknown) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return false;
      return (
        typeof coordinate[0] === 'number' &&
        typeof coordinate[1] === 'number' &&
        isValidCoordinate(coordinate[1], coordinate[0])
      );
    })
  );
}
