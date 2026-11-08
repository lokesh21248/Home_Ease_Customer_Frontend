/**
 * useCoupons — fetches and caches active promotional coupons from /coupons.
 *
 * - No auth required (public endpoint).
 * - staleTime: 5 minutes.
 * - gcTime: 30 minutes.
 * - Automatically invalidates on pull-to-refresh.
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, Coupon } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export function useCoupons() {
  return useQuery<Coupon[]>({
    queryKey: queryKeys.coupons(),
    queryFn: () => catalogApi.getCoupons(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });
}
