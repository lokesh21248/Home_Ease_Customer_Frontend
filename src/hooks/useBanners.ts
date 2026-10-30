/**
 * useBanners — fetches and caches promotional banners.
 *
 * - No auth required (public endpoint).
 * - staleTime: 5 minutes — banners may update more frequently than categories.
 * - gcTime: 30 minutes.
 * - retry: 1 — a single retry is sufficient for banners (non-critical).
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, Banner } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useBanners() {
  return useQuery<Banner[]>({
    queryKey: queryKeys.banners(),
    queryFn: () => catalogApi.getBanners(),
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}
