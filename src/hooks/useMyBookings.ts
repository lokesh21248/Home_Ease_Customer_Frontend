/**
 * useMyBookings — fetches and caches the authenticated user's booking history.
 *
 * - Requires auth (private endpoint).
 * - Cache key is scoped to userId — no data leaks between accounts.
 * - staleTime: 60 seconds — bookings change when the user creates/cancels.
 *   Callers should invalidate ['user', userId, 'bookings'] after mutations.
 * - gcTime: 5 minutes — short, since booking state is time-sensitive.
 * - retry: 1 — auth errors (401) skip retries via the global QueryClient config.
 * - enabled: only when userId is available (user is logged in).
 */

import { useQuery } from '@tanstack/react-query';
import { bookingApi, Booking } from '../api/client';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from '../context/AuthContext';

export function useMyBookings() {
  const { userId, isAuthenticated } = useAuth();

  return useQuery<Booking[]>({
    queryKey: queryKeys.myBookings(userId ?? ''),
    queryFn: () => bookingApi.getMyBookings(),
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,        // 1 minute — bookings are time-sensitive
    gcTime: 5 * 60 * 1000,       // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}
