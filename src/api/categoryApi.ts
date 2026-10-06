import apiClient from './axiosInstance';
import { Category } from '../types';
import { MOCK_CATEGORIES } from '../constants/mockData';
import { toValidUUID } from '../utils/uuid';

const normalizeCategory = (c: any): Category => {
  const name = c.name || 'Service';
  const id = toValidUUID(c.id || c.categoryId);
  const match = MOCK_CATEGORIES.find(
    (m) => m.name.toLowerCase() === name.toLowerCase() || m.id === id
  ) || MOCK_CATEGORIES[0];

  return {
    id,
    name,
    subtitle: c.subtitle || c.description || match.subtitle || 'Home services & care',
    iconName: c.iconName || c.icon || match.iconName || 'sparkles-outline',
    iconType: c.iconType || match.iconType || 'Ionicons',
    subcategories: Array.isArray(c.subcategories) && c.subcategories.length > 0 ? c.subcategories : match.subcategories,
    bannerUrl: c.bannerUrl || c.imageUrl || match.bannerUrl,
    accentColor: c.accentColor || match.accentColor || '#3D7A68',
  };
};

export const categoryApi = {
  // GET /categories (or fallback to /services)
  getAllCategories: async (): Promise<Category[]> => {
    try {
      const res = await apiClient.get<any>('/categories');
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data && Array.isArray(res.data.data)
        ? res.data.data
        : res.data?.categories && Array.isArray(res.data.categories)
        ? res.data.categories
        : null;

      if (list && list.length > 0) {
        return list.map(normalizeCategory);
      }
      return MOCK_CATEGORIES;
    } catch {
      try {
        const res = await apiClient.get<any>('/services');
        const list = Array.isArray(res.data) ? res.data : res.data?.data;
        if (list && list.length > 0) {
          // Extract unique categories from services
          const uniqueCats: Record<string, any> = {};
          list.forEach((s: any) => {
            const catId = toValidUUID(s.categoryId);
            if (!uniqueCats[catId] && s.categoryName) {
              uniqueCats[catId] = {
                id: catId,
                name: s.categoryName,
                description: s.description,
              };
            }
          });
          const catArray = Object.values(uniqueCats);
          if (catArray.length > 0) {
            return catArray.map(normalizeCategory);
          }
        }
      } catch {
        // silent
      }
      return MOCK_CATEGORIES;
    }
  },

  // GET /categories/{categoryId}
  getCategoryById: async (id: string): Promise<Category | undefined> => {
    const validId = toValidUUID(id);
    try {
      const res = await apiClient.get<any>(`/categories/${validId}`);
      const cat = res.data?.data || res.data;
      if (cat && (cat.id || cat.categoryId || cat.name)) {
        return normalizeCategory(cat);
      }
      return MOCK_CATEGORIES.find((c) => c.id === validId || c.id === id);
    } catch {
      return MOCK_CATEGORIES.find((c) => c.id === validId || c.id === id);
    }
  },
};
