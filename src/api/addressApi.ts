import { apiRequest } from './client';
import type { GeoPoint } from './geoApi';

export type AddressLabel = 'HOME' | 'OFFICE' | 'OTHER';

export interface CustomerAddress {
  id: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  houseNumber?: string;
  landmark?: string;
  label: AddressLabel;
  pincode?: string;
  city?: string;
  state?: string;
  isServiceable?: boolean;
}

export interface SaveAddressRequest extends GeoPoint {
  formattedAddress: string;
  houseNumber?: string;
  landmark?: string;
  label: AddressLabel;
  pincode?: string;
  city?: string;
  state?: string;
}

function mapToCustomerAddress(raw: any): CustomerAddress {
  const label: AddressLabel =
    raw.label === 'OFFICE' || raw.title?.toUpperCase() === 'OFFICE'
      ? 'OFFICE'
      : raw.label === 'OTHER' || raw.title?.toUpperCase() === 'OTHER'
      ? 'OTHER'
      : 'HOME';

  return {
    id: String(raw.id || raw.addressId || ''),
    formattedAddress: raw.formattedAddress || raw.addressLine || `${raw.city || ''}`,
    latitude: Number(raw.latitude ?? raw.lat ?? 0),
    longitude: Number(raw.longitude ?? raw.lng ?? 0),
    houseNumber: raw.houseNumber || '',
    landmark: raw.landmark || '',
    label,
    pincode: raw.pincode || '',
    city: raw.city || '',
    state: raw.state || '',
  };
}

export async function getAddresses(token?: string): Promise<CustomerAddress[]> {
  try {
    // Try standard user addresses endpoint verified on backend
    const rawList = await apiRequest<any[]>('/user/addresses', token);
    if (Array.isArray(rawList)) {
      return rawList.map(mapToCustomerAddress);
    }
  } catch {
    // Fallback to proposed /api/v1/addresses route
    const rawList = await apiRequest<any[]>('/api/v1/addresses', token);
    if (Array.isArray(rawList)) {
      return rawList.map(mapToCustomerAddress);
    }
  }
  return [];
}

export async function saveAddress(
  payload: SaveAddressRequest,
  token?: string
): Promise<CustomerAddress> {
  const backendPayload = {
    title: payload.label.charAt(0).toUpperCase() + payload.label.slice(1).toLowerCase(),
    addressLine: payload.formattedAddress,
    city: payload.formattedAddress.split(',').pop()?.trim() || 'Hyderabad',
    lat: payload.latitude,
    lng: payload.longitude,
    isDefault: false,
    houseNumber: payload.houseNumber,
    landmark: payload.landmark,
    label: payload.label,
    pincode: payload.pincode,
    state: payload.state,
  };

  try {
    const res = await apiRequest<any>('/user/addresses', token, {
      method: 'POST',
      body: JSON.stringify(backendPayload),
    });
    return mapToCustomerAddress(res);
  } catch {
    const res = await apiRequest<any>('/api/v1/addresses', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapToCustomerAddress(res);
  }
}

export async function updateAddress(
  id: string,
  payload: SaveAddressRequest,
  token?: string
): Promise<CustomerAddress> {
  const backendPayload = {
    title: payload.label.charAt(0).toUpperCase() + payload.label.slice(1).toLowerCase(),
    addressLine: payload.formattedAddress,
    city: payload.formattedAddress.split(',').pop()?.trim() || 'Hyderabad',
    lat: payload.latitude,
    lng: payload.longitude,
    houseNumber: payload.houseNumber,
    landmark: payload.landmark,
    label: payload.label,
  };

  try {
    const res = await apiRequest<any>(
      `/user/addresses/${encodeURIComponent(id)}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(backendPayload),
      }
    );
    return mapToCustomerAddress(res);
  } catch {
    const res = await apiRequest<any>(
      `/api/v1/addresses/${encodeURIComponent(id)}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    return mapToCustomerAddress(res);
  }
}

export async function deleteAddress(id: string, token?: string): Promise<void> {
  try {
    await apiRequest<void>(
      `/user/addresses/${encodeURIComponent(id)}`,
      token,
      { method: 'DELETE' }
    );
  } catch {
    await apiRequest<void>(
      `/api/v1/addresses/${encodeURIComponent(id)}`,
      token,
      { method: 'DELETE' }
    );
  }
}
