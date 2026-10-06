import apiClient from './axiosInstance';
import { Service, BannerSlide, SubService } from '../types';
import { MOCK_SERVICES, MOCK_BANNERS } from '../constants/mockData';
import { toValidUUID, REAL_CLEANING_CATEGORY_ID } from '../utils/uuid';

export interface ServiceFilterOptions {
  categoryId?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'recommended' | 'price_low' | 'price_high' | 'rating';
}

export const serviceApi = {
  // GET /banners
  getBanners: async (): Promise<BannerSlide[]> => {
    try {
      const res = await apiClient.get<any[]>('/banners');
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      if (list.length > 0) {
        return list.map((b: any) => ({
          id: toValidUUID(b.bannerId || b.id),
          bannerId: toValidUUID(b.bannerId || b.id),
          title: b.title,
          subtitle: b.subtitle || 'Book top rated professionals',
          imageUrl: b.imageUrl,
          targetType: b.targetType || 'SERVICE',
          targetId: b.targetId ? toValidUUID(b.targetId) : undefined,
          serviceId: b.targetType === 'SERVICE' || b.serviceId ? toValidUUID(b.serviceId || b.targetId) : undefined,
          categoryId: b.targetType === 'CATEGORY' || b.categoryId ? toValidUUID(b.categoryId || b.targetId) : undefined,
          isActive: b.isActive ?? true,
        }));
      }
      return MOCK_BANNERS;
    } catch {
      return MOCK_BANNERS;
    }
  },

  // GET /services
  getServices: async (filter?: ServiceFilterOptions): Promise<Service[]> => {
    const params: any = {};
    if (filter) {
      if (filter.categoryId) {
        params.categoryId = toValidUUID(filter.categoryId);
      }
      if (filter.searchQuery) params.searchQuery = filter.searchQuery;
      if (filter.minPrice !== undefined) params.minPrice = filter.minPrice;
      if (filter.maxPrice !== undefined) params.maxPrice = filter.maxPrice;
      if (filter.minRating !== undefined) params.minRating = filter.minRating;
      if (filter.sortBy) params.sortBy = filter.sortBy;
    }

    try {
      const res = await apiClient.get<any>('/services', { params });
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (rawList.length > 0) {
        return rawList.map((s: any) => ({
          id: toValidUUID(s.serviceId || s.id),
          serviceId: toValidUUID(s.serviceId || s.id),
          categoryId: toValidUUID(s.categoryId, REAL_CLEANING_CATEGORY_ID),
          categoryName: s.categoryName || s.name,
          name: s.name,
          description: s.description || '',
          imageUrl: s.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
          isActive: s.isActive ?? true,
          startingPrice: s.startingPrice || (s.subServices?.[0]?.basePrice ?? 499),
          duration: s.duration || `${s.subServices?.[0]?.estimatedMins || 60} mins`,
          rating: s.rating || 4.8,
          reviewsCount: s.reviewsCount || 120,
          included: s.included || ['Professional service guarantee', 'Standard hygiene check'],
          excluded: s.excluded || [],
          subServices: s.subServices?.map((sub: any) => ({
            subServiceId: toValidUUID(sub.subServiceId || sub.id),
            serviceId: toValidUUID(s.serviceId || s.id),
            name: sub.name,
            basePrice: sub.basePrice || sub.price || 499,
            unitLabel: sub.unitLabel || 'per session',
            estimatedMins: sub.estimatedMins || 60,
            isActive: sub.isActive ?? true,
            addons: sub.addons?.map((a: any) => ({
              addonId: toValidUUID(a.addonId || a.id),
              name: a.name,
              price: a.price || 149,
              isActive: a.isActive ?? true,
            })),
          })),
        }));
      }
      return filterLocalServices(filter);
    } catch {
      return filterLocalServices(filter);
    }
  },

  // GET /services/{serviceId}/sub-services
  getSubServices: async (serviceId: string): Promise<SubService[]> => {
    const validServiceId = toValidUUID(serviceId);
    try {
      const res = await apiClient.get<any>(`/services/${validServiceId}/sub-services`);
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (rawList.length > 0) {
        return rawList.map((sub: any) => ({
          subServiceId: toValidUUID(sub.subServiceId || sub.id),
          serviceId: validServiceId,
          name: sub.name,
          pricingType: sub.pricingType || 'FIXED',
          basePrice: sub.basePrice || sub.price || 499,
          unitLabel: sub.unitLabel || 'per session',
          estimatedMins: sub.estimatedMins || 60,
          imageUrl: sub.imageUrl,
          isActive: sub.isActive ?? true,
          addons: sub.addons?.map((a: any) => ({
            addonId: toValidUUID(a.addonId || a.id),
            subServiceId: toValidUUID(sub.subServiceId || sub.id),
            name: a.name,
            price: a.price || 149,
            isActive: a.isActive ?? true,
          })) || [],
        }));
      }
      return getLocalSubServices(serviceId);
    } catch {
      return getLocalSubServices(serviceId);
    }
  },

  // GET /services/{id}
  getServiceById: async (id: string): Promise<Service | undefined> => {
    const validId = toValidUUID(id);
    try {
      const res = await apiClient.get<any>(`/services/${validId}`);
      const s = res.data?.data || res.data;
      if (s && (s.serviceId || s.id || s.name)) {
        return {
          id: toValidUUID(s.serviceId || s.id),
          serviceId: toValidUUID(s.serviceId || s.id),
          categoryId: toValidUUID(s.categoryId, REAL_CLEANING_CATEGORY_ID),
          categoryName: s.categoryName || s.name,
          name: s.name,
          description: s.description || '',
          imageUrl: s.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
          isActive: s.isActive ?? true,
          startingPrice: s.startingPrice || 499,
          duration: s.duration || '60 mins',
          rating: s.rating || 4.8,
          reviewsCount: s.reviewsCount || 120,
          included: s.included || [],
          excluded: s.excluded || [],
          subServices: s.subServices,
          packages: s.packages,
        };
      }
      return MOCK_SERVICES.find((s) => s.id === validId || s.id === id);
    } catch {
      return MOCK_SERVICES.find((s) => s.id === validId || s.id === id);
    }
  },
};

function filterLocalServices(filter?: ServiceFilterOptions): Service[] {
  let filtered = [...MOCK_SERVICES];

  if (filter?.categoryId) {
    const validCatId = toValidUUID(filter.categoryId);
    filtered = filtered.filter((s) => s.categoryId === validCatId || s.categoryId === filter.categoryId);
  }

  if (filter?.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.categoryName.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }

  if (filter?.minRating) {
    filtered = filtered.filter((s) => s.rating >= (filter.minRating || 0));
  }

  if (filter?.sortBy === 'price_low') {
    filtered.sort((a, b) => a.startingPrice - b.startingPrice);
  } else if (filter?.sortBy === 'price_high') {
    filtered.sort((a, b) => b.startingPrice - a.startingPrice);
  } else if (filter?.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  return filtered;
}

function getLocalSubServices(serviceId: string): SubService[] {
  const validServiceId = toValidUUID(serviceId);
  const foundService = MOCK_SERVICES.find((s) => s.id === validServiceId || s.id === serviceId);
  if (foundService?.packages) {
    return foundService.packages.map((pkg) => ({
      subServiceId: toValidUUID(pkg.id),
      serviceId: validServiceId,
      name: pkg.name,
      basePrice: pkg.price,
      unitLabel: 'per session',
      estimatedMins: parseInt(pkg.duration, 10) || 60,
      isActive: true,
      addons: [
        {
          addonId: toValidUUID('addon-' + pkg.id),
          name: 'Eco-safe chemical boost',
          price: 149,
          isActive: true,
        },
      ],
    }));
  }
  return [];
}
