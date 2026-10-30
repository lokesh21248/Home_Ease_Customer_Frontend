/**
 * Custom Hook: useUserLocation
 * Provides unified access to customer location, readable address, loading state,
 * serviceability status, permission denial status, and methods to refresh or select new locations.
 */

import { useLocation, LocationContextType } from '../context/LocationContext';

export interface UseUserLocationResult extends LocationContextType {}

export function useUserLocation(): UseUserLocationResult {
  return useLocation();
}

export default useUserLocation;
