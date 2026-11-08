/**
 * Centralized, typed query key factory.
 *
 * Rules:
 *  - Public/static data (banners, categories, sub-services) uses a flat key — no userId segment.
 *  - User-specific data (bookings, addresses, profile) includes userId so that
 *    different accounts never share cached data.
 *  - Call queryClient.removeQueries({ queryKey: queryKeys.user(userId) }) on logout
 *    to wipe all private data in one shot.
 */

export const queryKeys = {
  // ── Public catalog data ──────────────────────────────────────────────────
  banners: () => ['banners'] as const,

  exploreServices: (categoryId?: string) => ['exploreServices', categoryId ?? 'all'] as const,

  coupons: () => ['coupons'] as const,

  categories: () => ['categories'] as const,

  serviceDetail: (serviceId: string) => ['serviceDetail', serviceId] as const,

  cart: () => ['cart'] as const,

  subServices: (serviceId: string) => ['subServices', serviceId] as const,

  // ── User-scoped private data ─────────────────────────────────────────────
  // All user keys nest under ['user', userId] so removeQueries with that
  // prefix clears every piece of private data on logout.
  user: (userId: string) => ['user', userId] as const,

  userProfile: (userId: string) => ['user', userId, 'profile'] as const,

  myBookings: (userId: string) => ['user', userId, 'bookings'] as const,

  addresses: (userId: string) => ['user', userId, 'addresses'] as const,

  timeSlots: (date?: string) => ['timeSlots', date ?? 'default'] as const,
} as const;
