/**
 * useUserProfile — fetches and caches the authenticated user's profile.
 *
 * - Requires auth (private endpoint).
 * - Cache key is scoped to userId.
 * - staleTime: 5 minutes — profile data is rarely changed mid-session.
 * - gcTime: 30 minutes.
 * - Callers must call queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(userId) })
 *   after any profile update mutation.
 */

import { useQuery } from '@tanstack/react-query';
import { userApi, UserProfile } from '../api/client';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from '../context/AuthContext';

export function useUserProfile() {
  const { userId, isAuthenticated } = useAuth();

  return useQuery<UserProfile>({
    queryKey: queryKeys.userProfile(userId ?? ''),
    queryFn: () => userApi.getProfile(),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false, // Profile doesn't need aggressive refreshing
  });
}
