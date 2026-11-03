/**
 * useCategories — fetches and caches public service categories.
 *
 * - Sanitizes categories to exclude test, internal, and unpublished records.
 * - Deduplicates categories by serviceId and name.
 * - Injects high-quality fallback images when imageUrl is missing or broken.
 * - Ensures consistent, clean category data across Home, Categories, and Booking screens.
 */

import { useQuery } from '@tanstack/react-query';
import { catalogApi, ServiceCategory } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  cleaning: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-services/service-images/fe488262-9d3f-4b20-afb3-9d58c959c46d.png',
  ac: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-services/service-images/34d65da1-7579-4175-90a2-ed035c9564b0.png',
  massage: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-services/service-images/327af16c-e323-4d77-9f89-48c144cbc4a1.png',
  electrician: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-services/service-images/87d9ea84-283d-4890-99e6-ebf757a0a1a0.png',
  plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&auto=format&fit=crop&q=80',
  painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&auto=format&fit=crop&q=80',
  carpentry: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=80',
  appliance: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80',
};

/**
 * Returns a curated, working fallback image URL based on category name.
 */
export function getCategoryFallbackImage(name?: string): string {
  if (!name) return CATEGORY_FALLBACK_IMAGES.default;
  const lower = name.toLowerCase();
  if (lower.includes('clean')) return CATEGORY_FALLBACK_IMAGES.cleaning;
  if (lower.includes('ac') || lower.includes('air') || lower.includes('cool')) return CATEGORY_FALLBACK_IMAGES.ac;
  if (lower.includes('massage') || lower.includes('spa') || lower.includes('relax')) return CATEGORY_FALLBACK_IMAGES.massage;
  if (lower.includes('electr') || lower.includes('wire') || lower.includes('fan')) return CATEGORY_FALLBACK_IMAGES.electrician;
  if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('drain')) return CATEGORY_FALLBACK_IMAGES.plumbing;
  if (lower.includes('paint')) return CATEGORY_FALLBACK_IMAGES.painting;
  if (lower.includes('carpent') || lower.includes('wood')) return CATEGORY_FALLBACK_IMAGES.carpentry;
  if (lower.includes('appliance') || lower.includes('repair')) return CATEGORY_FALLBACK_IMAGES.appliance;
  return CATEGORY_FALLBACK_IMAGES.default;
}

/**
 * Validates, filters out test/internal categories, deduplicates, and assigns fallback images.
 */
export function sanitizeCategories(categories: ServiceCategory[]): ServiceCategory[] {
  if (!Array.isArray(categories)) return [];

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const cleanList: ServiceCategory[] = [];

  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue;

    const id = String(cat.serviceId || '').trim();
    const name = String(cat.name || '').trim();

    if (!id || !name) continue;
    if (cat.isActive === false) continue;

    const lower = name.toLowerCase();

    // Exclude test, internal, and verification records (e.g. "Kafka Verification Vertical...")
    if (
      lower.includes('kafka') ||
      lower.includes('verification') ||
      lower.includes('test') ||
      lower.startsWith('dummy') ||
      lower.startsWith('temp')
    ) {
      continue;
    }

    // Deduplicate by ID and lowercase name
    if (seenIds.has(id) || seenNames.has(lower)) {
      continue;
    }
    seenIds.add(id);
    seenNames.add(lower);

    // Validate image URL: verify it's a valid remote URL, otherwise inject fallback
    const rawImage = cat.imageUrl ? String(cat.imageUrl).trim() : '';
    const hasValidImage =
      rawImage &&
      rawImage.startsWith('http') &&
      !rawImage.includes('example.com') &&
      !rawImage.endsWith('/null') &&
      !rawImage.endsWith('/undefined');

    const imageUrl = hasValidImage ? rawImage : getCategoryFallbackImage(name);

    cleanList.push({
      ...cat,
      serviceId: id,
      name,
      imageUrl,
      isActive: true,
      subServices: Array.isArray(cat.subServices) ? cat.subServices : [],
    });
  }

  return cleanList;
}

export function useCategories() {
  return useQuery<ServiceCategory[]>({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const data = await catalogApi.getCategories();
      return sanitizeCategories(data);
    },
    staleTime: 5 * 60 * 1000,     // 5 minutes
    gcTime: 60 * 60 * 1000,        // 60 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
