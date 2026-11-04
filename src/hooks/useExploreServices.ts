/**
 * useExploreServices — fetches and caches active explore services.
 *
 * - No auth required (public endpoint).
 * - staleTime: 3 minutes.
 * - gcTime: 30 minutes.
 * - Automatically invalidates on pull-to-refresh.
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, ExploreServiceItem } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useExploreServices(categoryId?: string) {
  return useQuery<ExploreServiceItem[]>({
    queryKey: queryKeys.exploreServices(categoryId),
    queryFn: () => catalogApi.getExploreServices(categoryId),
    staleTime: 3 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}

