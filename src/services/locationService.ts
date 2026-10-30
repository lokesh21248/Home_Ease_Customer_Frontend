/**
 * Location Service — Manages foreground GPS location, Google Maps geocoding,
 * backend proxy reverse geocoding fallback, bounded caching (24h TTL, 50m delta threshold),
 * local persistence, debounced search, and booking address payload dispatch.
 *
 * NOTE: Live tracking coordinates must remain strictly decoupled from reverse geocoding.
 */

import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi, BookingAddressRequest, geoApi } from '../api/client';
import { isValidCoordinate } from './coordinates';

export const LOCATION_STORAGE_KEY = '@homeease/saved_location';
export const LOCATION_PERMISSION_ASKED_KEY = '@homeease/location_permission_asked';
export const GEOCODE_CACHE_KEY = '@homeease/geocode_cache_v2';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_DISTANCE_DELTA_METERS = 50; // < 50m delta does not trigger re-geocoding
const MAX_IN_MEMORY_CACHE_ENTRIES = 200;

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

export interface FormattedAddress {
  formattedAddress: string;   // Short readable label: "Kukatpally, Hyderabad"
  shortAddress: string;       // "Kukatpally"
  houseNumber?: string;       // "Flat 402" or "12-3"
  building?: string;          // "Green Valley Apartments"
  street?: string;            // "Road No 36"
  area: string;               // "Kukatpally" or "Vivekananda Nagar"
  landmark?: string;          // "Near Metro Station"
  city: string;               // "Hyderabad"
  state?: string;             // "Telangana"
  pincode?: string;           // "500072"
  addressLine?: string;       // "Flat 402, Green Valley Apartments"
  fullAddress?: string;       // "Flat 402, Green Valley Apartments, Kukatpally, Hyderabad, Telangana 500072"
}

export interface UserLocationData {
  coordinates: UserCoordinates;
  address: FormattedAddress;
  timestamp?: number;
  isCustomSelected?: boolean;
}

export interface PermissionStatusResult {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

interface CachedGeocodeEntry {
  latitude: number;
  longitude: number;
  address: FormattedAddress;
  timestamp: number;
}

// In-memory cache map
const memoryCache = new Map<string, CachedGeocodeEntry>();
let isCacheHydrated = false;

/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCoordKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

async function hydrateCache(): Promise<void> {
  if (isCacheHydrated) return;
  try {
    const raw = await AsyncStorage.getItem(GEOCODE_CACHE_KEY);
    if (raw) {
      const parsed: Record<string, CachedGeocodeEntry> = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        if (now - entry.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, entry);
        }
      }
    }
  } catch (e) {
    console.log('[LocationService] Cache hydration notice:', e);
  } finally {
    isCacheHydrated = true;
  }
}

async function persistCache(): Promise<void> {
  try {
    const obj: Record<string, CachedGeocodeEntry> = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.log('[LocationService] Cache persist notice:', e);
  }
}

/**
 * Look up in-memory / storage cache for an address near these coordinates (< 50m) and not expired.
 */
async function findInCache(lat: number, lng: number): Promise<FormattedAddress | null> {
  await hydrateCache();
  const now = Date.now();

  // 1. Exact quantized grid key hit (~11m)
  const exactKey = getCoordKey(lat, lng);
  const exactMatch = memoryCache.get(exactKey);
  if (exactMatch && now - exactMatch.timestamp < CACHE_TTL_MS) {
    return exactMatch.address;
  }

  // 2. Spatial proximity hit (< 50m delta)
  for (const entry of memoryCache.values()) {
    if (now - entry.timestamp < CACHE_TTL_MS) {
      const dist = calculateDistanceMeters(lat, lng, entry.latitude, entry.longitude);
      if (dist <= MIN_DISTANCE_DELTA_METERS) {
        return entry.address;
      }
    }
  }

  return null;
}

function saveToCache(lat: number, lng: number, address: FormattedAddress): void {
  const key = getCoordKey(lat, lng);
  if (memoryCache.size >= MAX_IN_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    latitude: lat,
    longitude: lng,
    address,
    timestamp: Date.now(),
  });

  void persistCache();
}

/**
 * Checks whether device location services (GPS) are enabled.
 */
export async function isLocationServicesEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.log('[LocationService] hasServicesEnabledAsync notice:', error);
    return false;
  }
}

/**
 * Opens system location settings screen on Android or app settings on iOS.
 */
export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    } catch {
      // Fallback to standard settings
    }
  }
  await Linking.openSettings();
}

/**
 * Prompts user to enable device location with a direct button to Android settings.
 */
export function promptEnableLocationServices(): void {
  Alert.alert(
    'Location Services Disabled',
    'Please turn on device location (GPS) in your phone settings to automatically detect your current doorstep.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void openLocationSettings() },
    ]
  );
}

/**
 * Request foreground location permission.
 * Does not block app if user denies.
 */
export async function requestLocationPermission(): Promise<PermissionStatusResult> {
  try {
    await AsyncStorage.setItem(LOCATION_PERMISSION_ASKED_KEY, 'true');
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
      status,
    };
  } catch (error) {
    console.log('[LocationService] requestLocationPermission notice:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.DENIED,
    };
  }
}

/**
 * Check existing foreground location permission without prompting the user.
 */
export async function checkLocationPermission(): Promise<PermissionStatusResult> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return {
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
      status,
    };
  } catch (error) {
    console.log('[LocationService] checkLocationPermission notice:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.UNDETERMINED,
    };
  }
}

/**
 * Has the app previously requested permission?
 */
export async function hasRequestedPermissionBefore(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(LOCATION_PERMISSION_ASKED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Get current GPS coordinates once using balanced accuracy.
 * Verifies location services and handles failures gracefully.
 */
export async function getCurrentLocation(): Promise<UserCoordinates | null> {
  try {
    const servicesEnabled = await isLocationServicesEnabled();
    if (!servicesEnabled) {
      console.log('[LocationService] Device GPS / location services are disabled');
      return null;
    }

    let position: Location.LocationObject | null = null;
    try {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      // Fallback to last known position if fresh fix times out or indoor signal is weak
      position = await Location.getLastKnownPositionAsync();
    }

    if (
      !position ||
      !isValidCoordinate(position.coords.latitude, position.coords.longitude)
    ) {
      console.warn('[LocationService] Current GPS fix is unavailable.');
      return null;
    }
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.log('[LocationService] getCurrentLocation notice:', error);
    return null;
  }
}

// Preset localities for Hyderabad with validated pincodes
export const PRESET_LOCALITIES: {
  name: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}[] = [
  {
    name: 'Kukatpally',
    area: 'Kukatpally',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500072',
  },
  {
    name: 'Vivekananda Nagar, Kukatpally',
    area: 'Vivekananda Nagar',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500072',
  },
  {
    name: 'Jubilee Hills',
    area: 'Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
  },
  {
    name: 'Gachibowli',
    area: 'Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
  },
  {
    name: 'Madhapur / Hitec City',
    area: 'Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
  },
  {
    name: 'Banjara Hills',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
  },
  {
    name: 'Kondapur',
    area: 'Kondapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500084',
  },
  {
    name: 'Secunderabad',
    area: 'Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500003',
  },
  {
    name: 'Ameerpet',
    area: 'Ameerpet',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500016',
  },
  {
    name: 'Begumpet',
    area: 'Begumpet',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500016',
  },
];

/**
 * Reverse geocodes coordinates using Google Maps Geocoding API (with 5s timeout).
 */
async function googleReverseGeocode(lat: number, lng: number): Promise<FormattedAddress | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results || data.results.length === 0) return null;

    const first = data.results[0];
    const components = first.address_components || [];

    let houseNumber = '';
    let street = '';
    let sublocality = '';
    let locality = '';
    let administrativeArea = '';
    let pincode = '';

    for (const c of components) {
      const types: string[] = c.types || [];
      if (types.includes('street_number')) houseNumber = c.long_name;
      else if (types.includes('route')) street = c.long_name;
      else if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        if (!sublocality) sublocality = c.long_name;
      } else if (types.includes('locality')) {
        locality = c.long_name;
      } else if (types.includes('administrative_area_level_2') && !locality) {
        locality = c.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        administrativeArea = c.long_name;
      } else if (types.includes('postal_code')) {
        const cleaned = c.long_name.replace(/\D/g, '');
        if (cleaned.length === 6) pincode = cleaned;
      }
    }

    const area = sublocality || street || locality || 'Selected location';
    const city = locality || sublocality || 'Hyderabad';
    const state = administrativeArea || 'Telangana';

    const lineParts = [houseNumber, street, area].filter(Boolean);
    const addressLine = lineParts.length > 0 ? lineParts.join(', ') : area || city;

    let formattedAddress = '';
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      formattedAddress = `${area}, ${city}`;
    } else if (area) {
      formattedAddress = area;
    } else {
      formattedAddress = city || 'Current location';
    }

    const fullParts = [addressLine, city, state, pincode].filter(Boolean);
    const fullAddress = first.formatted_address || fullParts.join(', ');

    return {
      formattedAddress,
      shortAddress: area || city,
      houseNumber,
      street,
      area,
      city,
      state,
      pincode,
      addressLine,
      fullAddress,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.log('[LocationService] Google reverse geocode notice:', err);
    return null;
  }
}

/**
 * Searches places/locations using Google Maps Geocoding API if key is configured.
 */
async function googleSearchLocations(query: string): Promise<UserLocationData[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== 'OK' || !data.results) return [];

    return data.results.slice(0, 5).map((item: any) => {
      const components = item.address_components || [];
      let street = '';
      let sublocality = '';
      let locality = '';
      let state = '';
      let pincode = '';

      for (const c of components) {
        const types: string[] = c.types || [];
        if (types.includes('route')) street = c.long_name;
        else if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = c.long_name;
        else if (types.includes('locality')) locality = c.long_name;
        else if (types.includes('administrative_area_level_1')) state = c.long_name;
        else if (types.includes('postal_code')) {
          const cleaned = c.long_name.replace(/\D/g, '');
          if (cleaned.length === 6) pincode = cleaned;
        }
      }

      const area =
        sublocality || street || locality || item.formatted_address?.split(',')[0] || 'Selected location';
      const city = locality || 'Hyderabad';
      const formattedAddress = area && city && area !== city ? `${area}, ${city}` : area || city;

      return {
        coordinates: {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
        },
        address: {
          formattedAddress,
          shortAddress: area,
          houseNumber: '',
          building: '',
          street,
          area,
          city,
          state: state || 'Telangana',
          pincode,
          addressLine: area,
          fullAddress: item.formatted_address || formattedAddress,
        },
        isCustomSelected: true,
      };
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.log('[LocationService] Google search notice:', err);
    return [];
  }
}

/**
 * Reverse geocodes coordinates with priority:
 * 1. Cache hit (quantized key or < 50m distance delta, 24h TTL)
 * 2. Google Maps Geocoding API (client direct with 5s timeout)
 * 3. Backend Proxy API /api/v1/geo/reverse
 * 4. Native expo-location reverse geocoder
 */
export async function reverseGeocodeLocation(coords: UserCoordinates): Promise<FormattedAddress> {
  if (!isValidCoordinate(coords.latitude, coords.longitude)) {
    return {
      formattedAddress: 'Selected location',
      shortAddress: 'Selected location',
      area: 'Selected location',
      city: '',
      state: '',
      pincode: '',
      addressLine: 'Invalid coordinates',
      fullAddress: 'Invalid coordinates',
    };
  }

  // 1. Check in-memory / storage cache
  const cached = await findInCache(coords.latitude, coords.longitude);
  if (cached) {
    return cached;
  }

  // 2. Direct Google Maps Geocoding API
  const googleResult = await googleReverseGeocode(coords.latitude, coords.longitude);
  if (googleResult) {
    saveToCache(coords.latitude, coords.longitude, googleResult);
    return googleResult;
  }

  // 3. Backend Proxy reverse geocode (Spring Boot GeoService with server cache)
  try {
    const backendPlace = await geoApi.reverseGeocode(coords.latitude, coords.longitude);
    if (backendPlace) {
      const road = backendPlace.address?.road || '';
      const suburb = backendPlace.address?.suburb || '';
      const city = backendPlace.address?.city || 'Hyderabad';
      const state = backendPlace.address?.state || 'Telangana';
      const rawPostcode = backendPlace.address?.postcode || '';
      const pincode = rawPostcode.replace(/\D/g, '').length === 6 ? rawPostcode.replace(/\D/g, '') : '';
      const houseNumber = backendPlace.address?.houseNumber || '';

      const area = suburb || road || city || 'Selected location';
      const lineParts = [houseNumber, road, area].filter(Boolean);
      const addressLine = lineParts.length > 0 ? lineParts.join(', ') : area || city;

      let formattedAddress = '';
      if (area && city && area.toLowerCase() !== city.toLowerCase()) {
        formattedAddress = `${area}, ${city}`;
      } else if (area) {
        formattedAddress = area;
      } else {
        formattedAddress = city || 'Current location';
      }

      const fullAddress = backendPlace.displayName || [addressLine, city, state, pincode].filter(Boolean).join(', ');

      const resolved: FormattedAddress = {
        formattedAddress,
        shortAddress: area || city,
        houseNumber,
        street: road,
        area,
        city,
        state,
        pincode,
        addressLine,
        fullAddress,
      };

      saveToCache(coords.latitude, coords.longitude, resolved);
      return resolved;
    }
  } catch (backendErr) {
    console.log('[LocationService] Backend reverse geocode notice:', backendErr);
  }

  // 4. Native expo-location fallback
  try {
    const servicesOn = await isLocationServicesEnabled();
    if (servicesOn) {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (results && results.length > 0) {
        const item = results[0];

        const street = item.street || '';
        const streetNumber = item.streetNumber || '';
        const name = item.name || '';
        const district = item.district || '';
        const subregion = item.subregion || '';
        const city = item.city || district || subregion || 'Hyderabad';
        const state = item.region || 'Telangana';
        const rawPincode = item.postalCode || '';
        const pincode = rawPincode.replace(/\D/g, '').length === 6 ? rawPincode.replace(/\D/g, '') : '';

        const houseNumber = streetNumber || (name && /^\d+/.test(name) ? name : '');
        const building = name && name !== houseNumber && name !== street ? name : '';
        const area = district || subregion || (name && !/^\d+/.test(name) ? name : '') || street || city;

        const lineParts = [houseNumber, building, street, area].filter(Boolean);
        const addressLine = lineParts.length > 0 ? lineParts.join(', ') : area || city;

        let formattedAddress = '';
        if (area && city && area.toLowerCase() !== city.toLowerCase()) {
          formattedAddress = `${area}, ${city}`;
        } else if (area) {
          formattedAddress = area;
        } else if (city) {
          formattedAddress = city;
        } else {
          formattedAddress = 'Current location';
        }

        const fullParts = [addressLine, city, state, pincode].filter(Boolean);
        const fullAddress = fullParts.join(', ');

        const resolved: FormattedAddress = {
          formattedAddress,
          shortAddress: area || city || 'Current location',
          houseNumber,
          building,
          street,
          area: area || city || 'Current location',
          city,
          state,
          pincode,
          addressLine,
          fullAddress,
        };

        saveToCache(coords.latitude, coords.longitude, resolved);
        return resolved;
      }
    }
  } catch (error) {
    console.log('[LocationService] native reverseGeocode fallback notice:', error);
  }

  const coordinateLabel = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  return {
    formattedAddress: 'Selected location',
    shortAddress: 'Selected location',
    area: 'Selected location',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '',
    addressLine: coordinateLabel,
    fullAddress: `Coordinates: ${coordinateLabel}`,
  };
}

/**
 * Read saved location from AsyncStorage.
 */
export async function getSavedLocation(): Promise<UserLocationData | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserLocationData;
  } catch (error) {
    console.log('[LocationService] getSavedLocation error:', error);
    return null;
  }
}

/**
 * Persist selected location and address locally in AsyncStorage.
 */
export async function saveSelectedLocation(data: UserLocationData): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.log('[LocationService] saveSelectedLocation error:', error);
  }
}

/**
 * Search locations by text query (debounced 300ms by caller or helper).
 * Supports Kukatpally, Jubilee Hills, Gachibowli, Hyderabad, etc.
 */
export async function searchLocations(query: string): Promise<UserLocationData[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const results: UserLocationData[] = [];
  const seenNames = new Set<string>();

  // 1. Try Google Maps search if API key is configured
  const googleResults = await googleSearchLocations(trimmed);
  if (googleResults.length > 0) {
    return googleResults;
  }

  // 2. Query backend search proxy
  try {
    const backendResults = await geoApi.search(trimmed, 5);
    for (const item of backendResults) {
      const title = item.address?.road || item.address?.suburb || item.displayName.split(',')[0];
      const area =
        item.address?.suburb ||
        item.address?.road ||
        item.address?.city ||
        item.displayName.split(',')[0] ||
        'Selected location';
      const city = item.address?.city || 'Hyderabad';
      const state = item.address?.state || 'Telangana';
      const rawPostcode = item.address?.postcode || '';
      const pincode = rawPostcode.replace(/\D/g, '').length === 6 ? rawPostcode.replace(/\D/g, '') : '';
      const formattedAddress = `${area}, ${city}`;

      if (!seenNames.has(item.displayName.toLowerCase())) {
        seenNames.add(item.displayName.toLowerCase());
        results.push({
          coordinates: {
            latitude: item.lat,
            longitude: item.lon,
          },
          address: {
            formattedAddress,
            shortAddress: title || area,
            houseNumber: '',
            building: '',
            street: item.address?.road || '',
            area,
            city,
            state,
            pincode,
            addressLine: title,
            fullAddress: item.displayName,
          },
          isCustomSelected: true,
        });
      }
    }
  } catch (err) {
    console.log('[LocationService] Backend search notice:', err);
  }

  // 3. Fallback to native geocoder
  if (results.length < 3 && trimmed.length >= 3) {
    try {
      const servicesOn = await isLocationServicesEnabled();
      if (servicesOn) {
        const geoResults = await Location.geocodeAsync(trimmed);
        for (const geo of geoResults.slice(0, 3)) {
          const rev = await reverseGeocodeLocation({
            latitude: geo.latitude,
            longitude: geo.longitude,
          });
          if (!seenNames.has(rev.formattedAddress.toLowerCase())) {
            seenNames.add(rev.formattedAddress.toLowerCase());
            results.push({
              coordinates: {
                latitude: geo.latitude,
                longitude: geo.longitude,
              },
              address: rev,
              isCustomSelected: true,
            });
          }
        }
      }
    } catch {
      // Keep existing results
    }
  }

  return results;
}

/**
 * Send customer booking address to backend.
 * POST /api/users/me/addresses
 * Only called when explicitly selecting/confirming a booking address.
 * Never called for continuous GPS uploads.
 */
export async function sendBookingAddressToBackend(payload: BookingAddressRequest): Promise<any> {
  try {
    return await userApi.saveBookingAddress(payload);
  } catch (error: any) {
    console.log('[LocationService] saveBookingAddress notice:', error?.message);
    try {
      return await userApi.addAddress({
        title: payload.label || 'Current Location',
        addressLine: payload.addressLine,
        city: payload.city,
        lat: payload.latitude,
        lng: payload.longitude,
        isDefault: false,
      });
    } catch (fallbackErr) {
      console.log('[LocationService] addAddress fallback notice:', fallbackErr);
      return null;
    }
  }
}
