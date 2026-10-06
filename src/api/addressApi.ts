import apiClient from './axiosInstance';
import { Address } from '../types';
import { MOCK_ADDRESSES } from '../constants/mockData';
import { toValidUUID, generateUUID } from '../utils/uuid';

let localAddresses = [...MOCK_ADDRESSES];

function normalizeAddress(item: any): Address {
  const id = toValidUUID(item.addressId || item.id);
  const title = item.title || item.type || item.label || 'Home';
  const type: 'Home' | 'Work' | 'Other' =
    title === 'Work' || title === 'Other' ? title : 'Home';

  const addressLine =
    item.addressLine ||
    [item.houseFlat, item.street, item.area, item.city].filter(Boolean).join(', ') ||
    'Hyderabad, Telangana';

  const parts = addressLine.split(',').map((p: string) => p.trim());

  return {
    id,
    type,
    label: title,
    houseFlat: item.houseFlat || parts[0] || addressLine,
    street: item.street || parts[1] || '',
    area: item.area || parts[2] || '',
    city: item.city || 'Hyderabad',
    state: item.state || 'Telangana',
    pincode: item.pincode || '500081',
    landmark: item.landmark || undefined,
    isDefault: Boolean(item.isDefault),
    coordinates: {
      latitude: Number(item.lat ?? item.coordinates?.latitude ?? 17.448293),
      longitude: Number(item.lng ?? item.coordinates?.longitude ?? 78.374182),
    },
  };
}

export const addressApi = {
  // GET /user/addresses (or /users/addresses)
  getAddresses: async (): Promise<Address[]> => {
    try {
      let res;
      try {
        res = await apiClient.get<any>('/user/addresses');
      } catch {
        res = await apiClient.get<any>('/users/addresses');
      }

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data && Array.isArray(res.data.data)
        ? res.data.data
        : res.data?.addresses && Array.isArray(res.data.addresses)
        ? res.data.addresses
        : [];

      if (list.length > 0) {
        return list.map(normalizeAddress);
      }
      return localAddresses;
    } catch {
      return localAddresses;
    }
  },

  // POST /user/addresses
  addAddress: async (address: Partial<Address> & { title?: string; addressLine?: string; lat?: number; lng?: number }): Promise<Address> => {
    const title = address.title || address.type || address.label || 'Home';
    const addressLine =
      address.addressLine ||
      [address.houseFlat, address.street, address.area].filter(Boolean).join(', ') ||
      'Flat 402, Green Valley Apartments, Hitech City';

    const city = address.city || 'Hyderabad';
    const lat = address.lat ?? address.coordinates?.latitude ?? 17.448293;
    const lng = address.lng ?? address.coordinates?.longitude ?? 78.374182;
    const isDefault = Boolean(address.isDefault);

    const payload = {
      title,
      addressLine,
      city,
      lat,
      lng,
      isDefault,
    };

    try {
      let res;
      try {
        res = await apiClient.post<any>('/user/addresses', payload);
      } catch {
        res = await apiClient.post<any>('/users/addresses', payload);
      }

      const created = res.data?.data || res.data;
      if (created) {
        const normalized = normalizeAddress(created);
        localAddresses.push(normalized);
        return normalized;
      }
      throw new Error('Invalid response from server');
    } catch {
      const newAddress: Address = {
        id: generateUUID(),
        type: (title === 'Work' || title === 'Other' ? title : 'Home') as 'Home' | 'Work' | 'Other',
        label: title,
        houseFlat: address.houseFlat || addressLine.split(',')[0]?.trim() || addressLine,
        street: address.street || addressLine.split(',')[1]?.trim() || '',
        area: address.area || addressLine.split(',')[2]?.trim() || '',
        city,
        state: address.state || 'Telangana',
        pincode: address.pincode || '500081',
        landmark: address.landmark,
        isDefault,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };

      if (newAddress.isDefault) {
        localAddresses = localAddresses.map((a) => ({ ...a, isDefault: false }));
      }
      localAddresses.push(newAddress);
      return newAddress;
    }
  },

  // PUT /user/addresses/{id}
  updateAddress: async (id: string, updates: Partial<Address> & { title?: string; addressLine?: string; lat?: number; lng?: number }): Promise<Address> => {
    const validId = toValidUUID(id);
    const title = updates.title || updates.type || updates.label || 'Home';
    const addressLine =
      updates.addressLine ||
      [updates.houseFlat, updates.street, updates.area].filter(Boolean).join(', ') ||
      'Flat 402, Green Valley Apartments, Hitech City';

    const payload = {
      title,
      addressLine,
      city: updates.city || 'Hyderabad',
      lat: updates.lat ?? updates.coordinates?.latitude ?? 17.448293,
      lng: updates.lng ?? updates.coordinates?.longitude ?? 78.374182,
      isDefault: Boolean(updates.isDefault),
    };

    try {
      let res;
      try {
        res = await apiClient.put<any>(`/user/addresses/${validId}`, payload);
      } catch {
        res = await apiClient.put<any>(`/users/addresses/${validId}`, payload);
      }
      return normalizeAddress(res.data?.data || res.data);
    } catch {
      let updated: Address | undefined;
      localAddresses = localAddresses.map((a) => {
        if (a.id === validId || a.id === id) {
          updated = {
            ...a,
            ...updates,
            id: validId,
            coordinates: {
              latitude: payload.lat,
              longitude: payload.lng,
            },
          };
          return updated;
        }
        return updates.isDefault ? { ...a, isDefault: false } : a;
      });
      return updated || localAddresses[0];
    }
  },

  // DELETE /user/addresses/{addressId}
  deleteAddress: async (id: string): Promise<boolean> => {
    const validId = toValidUUID(id);
    try {
      try {
        await apiClient.delete(`/user/addresses/${validId}`);
      } catch {
        await apiClient.delete(`/users/addresses/${validId}`);
      }
      localAddresses = localAddresses.filter((a) => a.id !== validId && a.id !== id);
      return true;
    } catch {
      localAddresses = localAddresses.filter((a) => a.id !== validId && a.id !== id);
      return true;
    }
  },

  // PUT /user/addresses/{id}/default
  setDefaultAddress: async (id: string): Promise<boolean> => {
    const validId = toValidUUID(id);
    try {
      await apiClient.put(`/user/addresses/${validId}/default`);
      localAddresses = localAddresses.map((a) => ({
        ...a,
        isDefault: a.id === validId || a.id === id,
      }));
      return true;
    } catch {
      localAddresses = localAddresses.map((a) => ({
        ...a,
        isDefault: a.id === validId || a.id === id,
      }));
      return true;
    }
  },
};
