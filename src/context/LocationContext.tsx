/**
 * Location Context — Global state management for user location, address,
 * serviceability verification against backend PostgreSQL schema, and confirmation dialogs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserCoordinates,
  FormattedAddress,
  UserLocationData,
  requestLocationPermission,
  checkLocationPermission,
  getCurrentLocation,
  reverseGeocodeLocation,
  getSavedLocation,
  saveSelectedLocation,
} from '../services/locationService';
import { bookingApi, ServiceabilityCheckResponse } from '../api/client';

export interface LocationContextType {
  location: UserCoordinates | null;
  address: FormattedAddress | null;
  loading: boolean;
  permissionDenied: boolean;
  error: string | null;
  serviceability: ServiceabilityCheckResponse | null;
  checkingServiceability: boolean;
  isConfirmationModalVisible: boolean;
  refreshLocation: (forcePrompt?: boolean) => Promise<boolean>;
  selectLocation: (locationData: UserLocationData) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  checkAddressServiceability: (pincode: string) => Promise<ServiceabilityCheckResponse | null>;
  showConfirmationModal: () => void;
  hideConfirmationModal: () => void;
  confirmLocation: (customData?: UserLocationData) => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserCoordinates | null>(null);
  const [address, setAddress] = useState<FormattedAddress | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceability, setServiceability] = useState<ServiceabilityCheckResponse | null>(null);
  const [checkingServiceability, setCheckingServiceability] = useState<boolean>(false);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState<boolean>(false);

  /**
   * Check serviceability for a given pincode against Spring Boot / PostgreSQL
   */
  const checkAddressServiceability = useCallback(
    async (pincode: string): Promise<ServiceabilityCheckResponse | null> => {
      const cleaned = (pincode || '').replace(/\D/g, '');
      if (cleaned.length !== 6) {
        const unserviceable: ServiceabilityCheckResponse = {
          serviceable: false,
          pincode: cleaned,
          city: null,
          state: null,
          message: 'Location Not Serviceable: Please provide a valid 6-digit Indian PIN code.',
        };
        setServiceability(unserviceable);
        return unserviceable;
      }

      setCheckingServiceability(true);
      try {
        const res = await bookingApi.checkServiceability(cleaned);
        const standardizedRes: ServiceabilityCheckResponse = {
          ...res,
          message: res.serviceable
            ? res.message || 'Great! FirstDoor services are available in your area.'
            : res.message || 'Location Not Serviceable: We do not currently operate in this PIN code.',
        };
        setServiceability(standardizedRes);
        return standardizedRes;
      } catch (err: any) {
        console.log('[LocationContext] Serviceability check notice:', err?.message || err);
        const fallback: ServiceabilityCheckResponse = {
          serviceable: false,
          pincode: cleaned,
          city: null,
          state: null,
          message: 'Location Not Serviceable: Unable to verify service availability in this area.',
        };
        setServiceability(fallback);
        return fallback;
      } finally {
        setCheckingServiceability(false);
      }
    },
    []
  );

  /**
   * Fetch current GPS location, reverse geocode, and verify serviceability
   */
  const fetchAndSetCurrentLocation = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const coords = await getCurrentLocation();
    if (!coords) {
      setError('Unable to detect your location. Please check GPS settings.');
      setLoading(false);
      return false;
    }

    const formatted = await reverseGeocodeLocation(coords);

    const data: UserLocationData = {
      coordinates: coords,
      address: formatted,
      timestamp: Date.now(),
    };

    setLocation(coords);
    setAddress(formatted);
    setPermissionDenied(false);
    setError(null);
    setLoading(false);

    // Persist to local storage
    await saveSelectedLocation(data);

    // Verify serviceability if pincode available
    if (formatted.pincode && /^\d{6}$/.test(formatted.pincode)) {
      void checkAddressServiceability(formatted.pincode);
    } else {
      setServiceability({
        serviceable: false,
        pincode: '',
        city: formatted.city || null,
        state: formatted.state || null,
        message: 'Location Not Serviceable: Doorstep PIN code is missing or could not be resolved automatically.',
      });
    }

    return true;
  }, [checkAddressServiceability]);

  /**
   * Request permission & get GPS if granted
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const { granted } = await requestLocationPermission();
    if (!granted) {
      setPermissionDenied(true);
      setError('Location access is turned off.');
      setLoading(false);
      return false;
    }

    setPermissionDenied(false);
    return await fetchAndSetCurrentLocation();
  }, [fetchAndSetCurrentLocation]);

  /**
   * Refresh location:
   * If forcePrompt is true, requests permission if missing.
   * If forcePrompt is false, only refreshes if permission is already granted.
   */
  const refreshLocation = useCallback(
    async (forcePrompt: boolean = false): Promise<boolean> => {
      const perm = await checkLocationPermission();
      if (!perm.granted) {
        if (forcePrompt) {
          return await requestPermission();
        } else {
          setPermissionDenied(true);
          return false;
        }
      }

      setPermissionDenied(false);
      return await fetchAndSetCurrentLocation();
    },
    [fetchAndSetCurrentLocation, requestPermission]
  );

  /**
   * Explicitly select a location (from search, map pin, or saved addresses).
   */
  const selectLocation = useCallback(
    async (locationData: UserLocationData): Promise<void> => {
      setLocation(locationData.coordinates);
      setAddress(locationData.address);
      setError(null);
      await saveSelectedLocation(locationData);

      if (locationData.address.pincode && /^\d{6}$/.test(locationData.address.pincode)) {
        void checkAddressServiceability(locationData.address.pincode);
      } else {
        setServiceability({
          serviceable: false,
          pincode: '',
          city: locationData.address.city || null,
          state: locationData.address.state || null,
          message: 'Location Not Serviceable: A 6-digit PIN code is required to verify serviceability.',
        });
      }
    },
    [checkAddressServiceability]
  );

  const showConfirmationModal = useCallback(() => {
    setIsConfirmationModalVisible(true);
  }, []);

  const hideConfirmationModal = useCallback(() => {
    setIsConfirmationModalVisible(false);
  }, []);

  const confirmLocation = useCallback(
    async (customData?: UserLocationData): Promise<void> => {
      if (customData) {
        await selectLocation(customData);
      }
      setIsConfirmationModalVisible(false);
    },
    [selectLocation]
  );

  /**
   * On mount:
   * 1. Show saved location immediately.
   * 2. Check serviceability for saved location.
   * 3. Check permission without prompting; refresh quietly if granted.
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeLocation() {
      // 1. Load saved location
      const saved = await getSavedLocation();
      if (saved && isMounted) {
        setLocation(saved.coordinates);
        setAddress(saved.address);
        if (saved.address?.pincode && /^\d{6}$/.test(saved.address.pincode)) {
          void checkAddressServiceability(saved.address.pincode);
        }
      }

      // 2. Check existing permission
      const perm = await checkLocationPermission();
      if (!isMounted) return;

      if (!perm.granted) {
        if (perm.status === 'denied') {
          setPermissionDenied(true);
        }
        return;
      }

      // 3. Permission granted — quietly refresh if needed
      if (!saved) {
        setLoading(true);
      }

      try {
        const coords = await getCurrentLocation();
        if (coords && isMounted) {
          const rev = await reverseGeocodeLocation(coords);
          if (isMounted) {
            setLocation(coords);
            setAddress(rev);
            setPermissionDenied(false);
            setError(null);
            await saveSelectedLocation({ coordinates: coords, address: rev, timestamp: Date.now() });
            if (rev.pincode && /^\d{6}$/.test(rev.pincode)) {
              void checkAddressServiceability(rev.pincode);
            }
          }
        } else if (!saved && isMounted) {
          setError('Unable to detect your location. Select a saved address or enable GPS.');
        }
      } catch (err) {
        console.log('[LocationContext] Background GPS refresh notice:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeLocation();

    return () => {
      isMounted = false;
    };
  }, [checkAddressServiceability]);

  return (
    <LocationContext.Provider
      value={{
        location,
        address,
        loading,
        permissionDenied,
        error,
        serviceability,
        checkingServiceability,
        isConfirmationModalVisible,
        refreshLocation,
        selectLocation,
        requestPermission,
        checkAddressServiceability,
        showConfirmationModal,
        hideConfirmationModal,
        confirmLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
