/**
 * useCustomerLocation — High-precision foreground customer GPS tracking hook.
 *
 * Responsibilities:
 * 1. Checks device location services (GPS) status.
 * 2. Requests foreground location permissions using expo-location.
 * 3. Quickly acquires last-known position as instant preliminary fix.
 * 4. Acquires high-accuracy current position (balanced for battery & reliability).
 * 5. Watches position updates with distance & time throttling during active tracking.
 * 6. Provides clean error, permission-denied, and loading states with manual retry.
 * 7. Guaranteed cleanup on unmount to prevent background battery drain.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { isLocationServicesEnabled } from '../services/locationService';
import { isValidCoordinate } from '../services/coordinates';

export interface CustomerLocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface UseCustomerLocationResult {
  coords: CustomerLocationCoords | null;
  location: { latitude: number; longitude: number } | null;
  loading: boolean;
  isLocating: boolean;
  gpsEnabled: boolean;
  permissionGranted: boolean;
  permissionDenied: boolean;
  error: string | null;
  locateMe: () => Promise<CustomerLocationCoords | null>;
  refreshGps: () => Promise<CustomerLocationCoords | null>;
}

export function useCustomerLocation(enabled = true): UseCustomerLocationResult {
  const [coords, setCoords] = useState<CustomerLocationCoords | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);

  const acquireLocation = useCallback(async (): Promise<CustomerLocationCoords | null> => {
    if (!mountedRef.current) return null;
    setIsLocating(true);
    setError(null);

    try {
      // 1. Check if device location services (GPS hardware) are enabled
      const servicesOn = await isLocationServicesEnabled();
      if (!mountedRef.current) return null;
      setGpsEnabled(servicesOn);

      if (!servicesOn) {
        setIsLocating(false);
        setError('Device GPS is turned off. Turn on location services to track your position.');
        return null;
      }

      // 2. Check and request foreground permissions
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (!mountedRef.current) return null;

      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionGranted(false);
        setPermissionDenied(true);
        setIsLocating(false);
        setError('Location permission was denied. Allow location access to view your position on the map.');
        return null;
      }

      setPermissionGranted(true);
      setPermissionDenied(false);

      // 3. Fast preliminary fix from last known position (if recent)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (
          lastKnown &&
          isValidCoordinate(lastKnown.coords.latitude, lastKnown.coords.longitude) &&
          mountedRef.current
        ) {
          const preliminary: CustomerLocationCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            heading: lastKnown.coords.heading,
            speed: lastKnown.coords.speed,
            timestamp: lastKnown.timestamp,
          };
          setCoords(preliminary);
        }
      } catch {
        // Non-blocking: proceed to fresh GPS fix
      }

      // 4. Obtain fresh high-accuracy position
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!mountedRef.current) return null;

      if (!isValidCoordinate(fresh.coords.latitude, fresh.coords.longitude)) {
        throw new Error('Acquired invalid coordinates from device GPS.');
      }

      const freshCoords: CustomerLocationCoords = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        accuracy: fresh.coords.accuracy,
        heading: fresh.coords.heading,
        speed: fresh.coords.speed,
        timestamp: fresh.timestamp,
      };

      setCoords(freshCoords);
      setIsLocating(false);
      setError(null);
      return freshCoords;
    } catch (err: any) {
      if (!mountedRef.current) return null;
      const msg = err?.message || 'Unable to obtain GPS fix.';
      console.warn('[useCustomerLocation] Location acquisition notice:', msg);
      setIsLocating(false);
      setError(msg);
      return null;
    }
  }, []);

  // Initialize and start live watching when enabled
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setIsLocating(false);
      return;
    }

    let activeSub: Location.LocationSubscription | null = null;

    void (async () => {
      const initial = await acquireLocation();
      if (!mountedRef.current || !enabled) return;

      // Start watcher only if device services are ON and permission was granted
      const servicesOn = await isLocationServicesEnabled();
      const { status } = await Location.getForegroundPermissionsAsync();
      if (servicesOn && status === Location.PermissionStatus.GRANTED && mountedRef.current) {
        try {
          activeSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Updates when moving >= 10 meters
              timeInterval: 6000,   // Check every 6 seconds
            },
            (update) => {
              if (!mountedRef.current) return;
              if (isValidCoordinate(update.coords.latitude, update.coords.longitude)) {
                setCoords({
                  latitude: update.coords.latitude,
                  longitude: update.coords.longitude,
                  accuracy: update.coords.accuracy,
                  heading: update.coords.heading,
                  speed: update.coords.speed,
                  timestamp: update.timestamp,
                });
                setIsLocating(false);
                setError(null);
              }
            }
          );
          subscriptionRef.current = activeSub;
        } catch (watchErr) {
          console.warn('[useCustomerLocation] Watcher notice:', watchErr);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (activeSub) {
        activeSub.remove();
      }
    };
  }, [enabled, acquireLocation]);

  const location = coords ? { latitude: coords.latitude, longitude: coords.longitude } : null;

  return {
    coords,
    location,
    loading: isLocating,
    isLocating,
    gpsEnabled,
    permissionGranted,
    permissionDenied,
    error,
    locateMe: acquireLocation,
    refreshGps: acquireLocation,
  };
}

export default useCustomerLocation;
