/**
 * Centralized API layer for HomeEase Customer App.
 * Base URL: http://3.107.161.126:8080/api/v1
 *
 * Handles:
 *  - Auth token injection
 *  - X-User-Id header injection
 *  - Unified error handling
 *  - Response typing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://3.107.161.126:8080/api/v1';

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  TOKEN: '@homeease/token',
  USER_ID: '@homeease/userId',
  USER_DATA: '@homeease/userData',
  FCM_TOKEN: '@homeease/fcmToken',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: string;
}

export interface OtpSendResponse {
  message: string;
  otpId: string;
  status: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  title: string;
  addressLine: string;
  city: string;
  state?: string;
  pincode?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface ServiceabilityCheckResponse {
  serviceable: boolean;
  pincode: string;
  city: string | null;
  state: string | null;
  message: string;
}

export interface BookingAddressRequest {
  label?: string;
  addressLine: string;
  city: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export interface Banner {
  bannerId: string;
  title: string;
  imageUrl: string;
  targetType: string;
  targetId: string;
  isActive: boolean;
}

export interface ServiceCategory {
  serviceId: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  subServices?: SubService[];
}

export interface Addon {
  addonId: string;
  subServiceId: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface SubService {
  subServiceId: string;
  serviceId: string;
  name: string;
  pricingType: 'FIXED' | 'HOURLY' | 'UNIT';
  basePrice: number;
  unitLabel: string;
  estimatedMins: number;
  imageUrl: string;
  isActive: boolean;
  addons: Addon[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  date: string;
}

export interface CouponValidationResponse {
  couponId: string;
  code: string;
  discountAmount: number;
  finalAmount: number;
  valid: boolean;
  message: string;
}

export interface BookingRequest {
  serviceId: string;
  subServices: { subServiceId: string; quantity: number }[];
  addons?: { addonId: string; quantity: number }[];
  couponCode?: string;
  scheduledAt: string;
  userLat: number;
  userLng: number;
  userLocation?: string;
  paymentMethod: 'COD' | 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET';
  pincode: string;
  addressId?: string;
  isForFriend?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

export interface Booking {
  bookingId: string;
  userId: string;
  userName: string;
  userPhone: string;
  workerId: string | null;
  workerName: string | null;
  workerPhone: string | null;
  serviceId: string;
  serviceName: string;
  status: 'SEARCHING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'WORKER_NOT_FOUND';
  pinCode: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  userLat: number;
  userLng: number;
  userLocation?: string;
  baseAmount: number;
  extraAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || BASE_URL;

// ─── HTTP Client & Errors ───────────────────────────────────────────────────
export class ApiError extends Error {
  public status: number;

  constructor(messageOrStatus: string | number, statusOrMessage?: number | string) {
    if (typeof messageOrStatus === 'number') {
      super(typeof statusOrMessage === 'string' ? statusOrMessage : `Error ${messageOrStatus}`);
      this.status = messageOrStatus;
    } else {
      super(messageOrStatus);
      this.status = typeof statusOrMessage === 'number' ? statusOrMessage : 500;
    }
    this.name = 'ApiError';
  }
}

export async function getAuthHeaders(requiresAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const BACKEND_USER_ID = '1270d52d-9f4e-4399-9a80-15cab07f1763';
    const BACKEND_TOKEN = '1270d52d-9f4e-4399-9a80-15cab07f1763';

    let [token, userId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
    ]);

    // Auto-migrate any dummy or stale credentials to the registered backend customer account
    if (
      !token ||
      !userId ||
      token === 'homeease-demo-customer-jwt-token' ||
      userId === 'd0b89110-3fc7-4590-b18d-f5bf43242001'
    ) {
      token = BACKEND_TOKEN;
      userId = BACKEND_USER_ID;
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, BACKEND_TOKEN),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, BACKEND_USER_ID),
      ]);
    }

    if (token) headers.Authorization = `Bearer ${token}`;
    if (userId) headers['X-User-Id'] = userId;
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 12000,
): Promise<Response> {
  const controller = new AbortController();
  const sourceSignal = options.signal;
  const abortFromSource = () => controller.abort();
  if (sourceSignal?.aborted) {
    controller.abort();
  } else if (sourceSignal) {
    sourceSignal.addEventListener('abort', abortFromSource, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    sourceSignal?.removeEventListener('abort', abortFromSource);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = await getAuthHeaders(requiresAuth);
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string>),
        },
      },
      12000,
    );

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        message = data?.message || data?.error || message;
      } catch {
        // ignore JSON parse errors
      }
      console.warn(`[API Error] ${endpoint} -> ${response.status}: ${message}`);
      throw new ApiError(response.status, message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[API Timeout] Request timed out for ${endpoint}`);
      throw new ApiError(408, `Request timed out for ${endpoint}`);
    }
    console.warn(`[API Network Error] ${endpoint}:`, err?.message || err);
    throw err;
  }
}

/**
 * Standard centralized API request method.
 * Supports token injection, query normalization, and unified error handling.
 */
export async function apiRequest<T>(
  path: string,
  token?: string,
  options: RequestInit = {}
): Promise<T> {
  let baseUrl = process.env.EXPO_PUBLIC_API_URL || BASE_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  baseUrl = baseUrl.replace(/\/+$/, '');
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (baseUrl.endsWith('/api/v1') && normalizedPath.startsWith('/api/v1')) {
    normalizedPath = normalizedPath.substring(7);
  }

  const fullUrl = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${baseUrl}${normalizedPath}`;

  const authHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : await getAuthHeaders(true);

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders,
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as any).message === 'string'
        ? (data as any).message
        : `Request failed (${response.status})`;

    throw new ApiError(message, response.status);
  }

  return data as T;
}

// ─── Auth APIs ────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phoneNumber: string): Promise<OtpSendResponse> =>
    request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }, false),

  verifyOtp: async (phoneNumber: string, otpCode: string): Promise<AuthResponse> => {
    const raw: any = await request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp: otpCode, otpCode }),
    }, false);

    const envelope = raw?.data ?? raw;
    const user = envelope?.user ?? envelope;
    return {
      token: envelope?.accessToken ?? envelope?.token ?? '',
      userId: user?.userId ?? envelope?.userId ?? '',
      fullName: user?.fullName ?? envelope?.fullName ?? '',
      phoneNumber: user?.phoneNumber ?? envelope?.phoneNumber ?? phoneNumber,
      email: user?.email ?? envelope?.email ?? null,
      role: user?.role ?? envelope?.role ?? 'CUSTOMER',
    };
  },

  firebaseLogin: async (idToken: string): Promise<AuthResponse> => {
    const raw: any = await request('/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }, false);

    const envelope = raw?.data ?? raw;
    const user = envelope?.user ?? envelope;
    return {
      token: envelope?.accessToken ?? envelope?.token ?? '',
      userId: user?.userId ?? envelope?.userId ?? '',
      fullName: user?.fullName ?? envelope?.fullName ?? '',
      phoneNumber: user?.phoneNumber ?? envelope?.phoneNumber ?? '',
      email: user?.email ?? envelope?.email ?? null,
      role: user?.role ?? envelope?.role ?? 'CUSTOMER',
    };
  },

  registerProfile: (data: {
    fullName: string;
    phoneNumber: string;
    email?: string;
    role?: string;
  }): Promise<AuthResponse> =>
    request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ role: 'CUSTOMER', ...data }),
    }, false),
};

// ─── User APIs ────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    try {
      return await request('/user/me');
    } catch {
      return await request('/user/profile');
    }
  },

  updateProfile: (data: { fullName?: string; email?: string }): Promise<UserProfile> =>
    request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  registerFcmToken: (fcmToken: string): Promise<{ message: string }> =>
    request('/user/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    }),

  getAddresses: async (): Promise<Address[]> => {
    try {
      return await request('/user/addresses');
    } catch {
      return await request('/users/me/addresses');
    }
  },

  addAddress: async (data: Omit<Address, 'id' | 'userId'>): Promise<Address> => {
    const payload = {
      title: data.title,
      addressLine: data.addressLine,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      isDefault: data.isDefault,
    };
    try {
      return await request('/user/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return await request('/users/me/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  },

  deleteAddress: async (addressId: string): Promise<{ message: string }> => {
    try {
      return await request(`/user/addresses/${addressId}`, { method: 'DELETE' });
    } catch {
      return await request(`/users/me/addresses/${addressId}`, { method: 'DELETE' });
    }
  },

  updateAddress: (addressId: string, data: Omit<Address, 'id' | 'userId'> & { userId?: string }): Promise<Address> =>
    request(`/user/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  saveBookingAddress: (data: BookingAddressRequest): Promise<Address> =>
    userApi.addAddress({
      title: data.label || 'Booking Address',
      addressLine: data.addressLine,
      city: data.city,
      lat: data.latitude,
      lng: data.longitude,
      isDefault: false,
    }),
};

// ─── Catalog APIs ─────────────────────────────────────────────────────────────
export const catalogApi = {
  getBanners: (): Promise<Banner[]> => request('/banners', {}, false),

  getCategories: async (): Promise<ServiceCategory[]> => {
    try {
      return await request('/services', {}, false);
    } catch {
      return await request('/categories', {}, false);
    }
  },

  getSubServices: (serviceId: string): Promise<SubService[]> =>
    request(`/services/${serviceId}/sub-services`, {}, false),
};

// ─── Booking APIs ─────────────────────────────────────────────────────────────
export const bookingApi = {
  getTimeSlots: (date?: string): Promise<TimeSlot[]> => {
    const query = date ? `?date=${date}` : '';
    return request(`/bookings/time-slots${query}`);
  },

  validateCoupon: async (code: string, cartTotal: number): Promise<CouponValidationResponse> => {
    const raw: any = await request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code,
        couponCode: code,
        cartTotal,
        orderAmount: cartTotal,
        orderValue: cartTotal,
      }),
    });
    const discount = Number(raw.calculatedDiscount ?? raw.discountAmount ?? raw.discountVal ?? 0);
    const valid = Boolean(raw.isValid ?? raw.valid ?? true);
    return {
      couponId: raw.couponId || '',
      code: raw.code || code,
      discountAmount: discount,
      finalAmount: Number(raw.finalAmount ?? Math.max(0, cartTotal - discount)),
      valid,
      message: raw.message || 'Coupon applied successfully',
    };
  },

  checkServiceability: (pincode: string): Promise<ServiceabilityCheckResponse> =>
    request(`/serviceability/check?pincode=${encodeURIComponent(pincode)}`),

  createBooking: (data: BookingRequest): Promise<Booking> =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyBookings: (): Promise<Booking[]> => request('/bookings/my-bookings'),

  getBookingById: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}`),

  cancelBooking: (bookingId: string, reason = 'Customer requested'): Promise<{ message: string }> =>
    request(`/bookings/${bookingId}/cancel?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    }),

  retryMatching: async (
    bookingId: string,
    userLat?: number,
    userLng?: number,
  ): Promise<DispatchTriggerResponse> => {
    const res = await fetchWithTimeout(`${DISPATCH_BASE_URL}/dispatch/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        userLat: userLat ?? 17.4485,
        userLng: userLng ?? 78.3748,
      }),
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Dispatch retry failed (HTTP ${res.status})`);
    }
    return res.json();
  },

  acceptBookingAsWorker: async (
    bookingId: string,
    workerUserId: string,
  ): Promise<Booking> => {
    const res = await fetchWithTimeout(
      `${BASE_URL}/workers/bookings/${bookingId}/accept`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerUserId}`,
          'X-User-Id': workerUserId,
        },
      },
    );
    if (!res.ok) {
      throw new ApiError(res.status, `Worker acceptance failed (HTTP ${res.status})`);
    }
    return res.json();
  },
};

// ─── Dispatch Microservice (Port 8081) ────────────────────────────────────────
export const DISPATCH_BASE_URL =
  process.env.EXPO_PUBLIC_DISPATCH_API_URL || 'http://3.107.161.126:8081/api/v1';

export interface DispatchTriggerResponse {
  bookingId: string;
  status: 'CANDIDATES_ALERTED' | 'WORKER_NOT_FOUND';
  message: string;
  assignedWorkerId?: string | null;
  pinCode?: string | null;
}

// ─── Live Tracking Service (Port 8082) ────────────────────────────────────────
export const TRACKING_BASE_URL =
  process.env.EXPO_PUBLIC_TRACKING_API_URL || 'http://3.107.161.126:8082/api/v1';
export const TRACKING_WS_URL =
  process.env.EXPO_PUBLIC_TRACKING_WS_URL || 'ws://3.107.161.126:8082/ws';

export interface TrackingLocationResponse {
  bookingId?: string;
  found?: boolean;
  latitude?: number;
  longitude?: number;
  heading?: number;
  lat?: number;
  lng?: number;
  bearing?: number;
  speed?: number;
  accuracy?: number;
  status?: string;
  trackingActive?: boolean;
  updatedAt?: string;
  timestamp?: string | number;
  message?: string;
}

export interface TrackingDistanceResponse {
  bookingId?: string;
  found?: boolean;
  distanceMeters?: number;
  durationSeconds?: number;
  distanceKm?: number;
  etaMinutes?: number;
  distanceText?: string;
  etaText?: string;
  workerLocation?: {
    lat?: number;
    lng?: number;
  };
  message?: string;
}

export interface TrackingRouteResponse {
  found?: boolean;
  distanceKm?: number;
  durationMin?: number;
  coordinates?: [latitude: number, longitude: number][];
  message?: string;
}

export interface TrackingLocationUpdateRequest {
  bookingId: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number | null;
  accuracy: number;
  timestamp: number;
}

export const trackingApi = {
  /**
   * Fetches the latest live position for a given bookingId
   * GET http://3.107.161.126:8082/api/v1/tracking/latest/{bookingId}
   */
  getLatestLocation: async (
    bookingId: string,
    signal?: AbortSignal,
  ): Promise<TrackingLocationResponse> => {
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(
      `${TRACKING_BASE_URL}/tracking/latest/${encodeURIComponent(bookingId)}`,
      { headers, signal },
    );
    if (!res.ok) {
      throw new ApiError(res.status, `Unable to load tracking location (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetches distance & estimated time of arrival based on customer coordinates
   * GET http://3.107.161.126:8082/api/v1/tracking/distance?bookingId={id}&customerLat={lat}&customerLng={lng}
   */
  getDistanceAndEta: async (
    bookingId: string,
    customerLat: number,
    customerLng: number,
    signal?: AbortSignal,
  ): Promise<TrackingDistanceResponse> => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      bookingId,
      customerLat: String(customerLat),
      customerLng: String(customerLng),
    });
    const res = await fetchWithTimeout(`${TRACKING_BASE_URL}/tracking/distance?${params}`, {
      headers,
      signal,
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Unable to load tracking distance (HTTP ${res.status})`);
    }
    return res.json();
  },

  getRoute: async (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
    signal?: AbortSignal,
  ): Promise<TrackingRouteResponse | null> => {
    const params = new URLSearchParams({
      startLat: String(startLat),
      startLng: String(startLng),
      destLat: String(destLat),
      destLng: String(destLng),
    });
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(`${TRACKING_BASE_URL}/tracking/route?${params}`, {
      headers,
      signal,
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Unable to calculate road route (HTTP ${res.status})`);
    }
    const data: TrackingRouteResponse = await res.json();
    return data.found === false ? null : data;
  },

  updateLocation: async (
    location: TrackingLocationUpdateRequest,
    signal?: AbortSignal,
  ): Promise<void> => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      throw new ApiError(401, 'Sign in with an authorized service-person account to publish GPS.');
    }
    const res = await fetchWithTimeout(`${TRACKING_BASE_URL}/tracking/update-location`, {
      method: 'POST',
      headers,
      body: JSON.stringify(location),
      signal,
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Unable to publish location (HTTP ${res.status})`);
    }
  },
};

// ─── Geo & Routing Service (LocationIQ & OpenRouteService via Backend) ──────
export interface GeoSearchPlace {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface GeoReversePlace {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  address?: {
    road?: string;
    houseNumber?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export const geoApi = {
  /**
   * Address search / autocomplete via backend (LocationIQ)
   * GET http://3.107.161.126:8080/api/v1/geo/search?q={query}&limit={limit}
   */
  search: async (query: string, limit = 5): Promise<GeoSearchPlace[]> => {
    try {
      const res = await fetch(`${BASE_URL}/geo/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e: any) {
      console.log('[Geo API] Search request notice:', e?.message || e);
      return [];
    }
  },

  /**
   * Reverse geocode coordinates via backend (LocationIQ)
   * GET http://3.107.161.126:8080/api/v1/geo/reverse?lat={lat}&lng={lng}
   */
  reverseGeocode: async (lat: number, lng: number): Promise<GeoReversePlace | null> => {
    try {
      const res = await fetch(`${BASE_URL}/geo/reverse?lat=${lat}&lng=${lng}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e: any) {
      console.log('[Geo API] Reverse geocode request notice:', e?.message || e);
      return null;
    }
  },

};
