/**
 * useAddresses — fetches and caches the authenticated user's saved addresses.
 *
 * - Requires auth (private endpoint).
 * - Cache key is scoped to userId — no data leaks between accounts.
 * - staleTime: 5 minutes — addresses are rarely changed.
 * - gcTime: 30 minutes.
 * - Callers must call queryClient.invalidateQueries({ queryKey: queryKeys.addresses(userId) })
 *   after any add/edit/delete address mutation.
 */

import { useQuery } from '@tanstack/react-query';
import { userApi, Address } from '../api/client';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from '../context/AuthContext';

export function useAddresses() {
  const { userId, isAuthenticated } = useAuth();

  return useQuery<Address[]>({
    queryKey: queryKeys.addresses(userId ?? ''),
    queryFn: () => userApi.getAddresses(),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}
