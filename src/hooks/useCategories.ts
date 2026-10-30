/**
 * useCategories — fetches and caches public service categories.
 *
 * - No auth required (public endpoint).
 * - staleTime: 10 minutes — categories change infrequently.
 * - gcTime: 60 minutes — keep in memory for the whole session.
 * - Refetch on window focus so the home screen always stays fresh.
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, ServiceCategory } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useCategories() {
  return useQuery<ServiceCategory[]>({
    queryKey: queryKeys.categories(),
    queryFn: () => catalogApi.getCategories(),
    staleTime: 10 * 60 * 1000,   // 10 minutes
    gcTime: 60 * 60 * 1000,       // 60 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
