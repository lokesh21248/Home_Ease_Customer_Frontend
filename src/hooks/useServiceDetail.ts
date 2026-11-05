/**
 * useServiceDetail — Fetches dynamic service details (durations, packages,
 * how-it-works, features, instructions, availability) from the backend database.
 */

import { useQuery } from '@tanstack/react-query';
import { serviceDetailApi, DynamicServiceDetail } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useServiceDetail(serviceId: string | undefined) {
  return useQuery<DynamicServiceDetail>({
    queryKey: queryKeys.serviceDetail(serviceId ?? ''),
    queryFn: () => serviceDetailApi.getServiceDetail(serviceId!),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

