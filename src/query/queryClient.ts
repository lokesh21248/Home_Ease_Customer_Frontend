/**
 * Shared QueryClient configuration.
 *
 * Per-query defaults are deliberately conservative:
 *  - Public catalog data (categories, sub-services, banners): long stale time, cached for 1 hour.
 *  - User-specific data (bookings, addresses, profile): shorter stale time, garbage-collected quickly.
 *
 * Individual useQuery calls may override these defaults via their own options.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Do not retry on client-side auth errors (401/403)
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      // Default stale time — overridden per-query below
      staleTime: 60 * 1000, // 1 minute baseline
      // Garbage-collect unused data after 5 minutes by default
      gcTime: 5 * 60 * 1000,
      // Refetch when the app comes back to the foreground
      refetchOnWindowFocus: true,
      // Refetch when the device regains network connectivity
      refetchOnReconnect: true,
      // Do not automatically refetch on mount if data is still fresh
      refetchOnMount: true,
    },
    mutations: {
      // Do not retry mutations — let the caller decide
      retry: false,
    },
  },
});
