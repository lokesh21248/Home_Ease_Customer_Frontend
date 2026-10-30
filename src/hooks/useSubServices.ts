/**
 * useSubServices — fetches and caches sub-services for a specific service category.
 *
 * - No auth required (public endpoint).
 * - Keyed by serviceId so each category gets its own independent cache entry.
 * - staleTime: 10 minutes — sub-service pricing/details change infrequently.
 * - gcTime: 60 minutes — keep loaded categories warm during a session.
 * - refetchOnWindowFocus: false — sub-service data does not need aggressive refreshing.
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, SubService } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useSubServices(serviceId: string | undefined) {
  return useQuery<SubService[]>({
    queryKey: queryKeys.subServices(serviceId ?? ''),
    queryFn: () => catalogApi.getSubServices(serviceId!),
    enabled: !!serviceId,
    staleTime: 10 * 60 * 1000,   // 10 minutes
    gcTime: 60 * 60 * 1000,       // 60 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}
