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
  process.env.EXPO_PUBLIC_API_URL || 'http://3.108.55.219/api/v1';

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
  areaName?: string | null;
  localities?: string[] | null;
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

export interface ExploreServiceItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number | null;
  rating?: number;
  reviewCount?: number;
  displayOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface Coupon {
  couponId: string;
  code: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  discountVal: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  timesUsed?: number;
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

export interface AvailableDate {
  date: string;
  dayName: string;
  monthName: string;
  dayOfMonth: number;
  available: boolean;
  availableSlotsCount: number;
}

export interface AvailableSlot {
  time: string;
  startTime: string;
  endTime: string;
  available: boolean;
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  availableWorkersCount: number;
  reason?: string;
}

export interface NearbyWorker {
  workerId: string;
  fullName: string;
  rating: number;
  distanceMeters: number;
  estimatedArrivalMinutes: number;
  avatarUrl?: string;
  isOnline: boolean;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface BookingRequest {
  serviceId: string;
  subServices: { subServiceId: string; quantity: number }[];
  addons?: { addonId: string; quantity: number }[];
  couponCode?: string;
  bookingType?: 'INSTANT' | 'SCHEDULED';
  scheduledAt: string;
  scheduledEndAt?: string;
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
  idempotencyKey?: string;
  holdId?: string;
  lockToken?: string;
  timeSlot?: string;
  scheduledDate?: string;
}

export interface SlotWindow {
  windowKey: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  availableCapacity: number;
  available: boolean;
}

export interface HoldResponse {
  holdId: string;
  lockToken: string;
  windowKey: string;
  serviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  remainingCapacity: number;
  message?: string;
}

export interface Booking {
  bookingId: string;
  userId: string;
  userName: string;
  userPhone: string;
  workerId: string | null;
  workerName: string | null;
  workerPhone: string | null;
  workerAvatarUrl?: string | null;
  workerRating?: number | null;
  serviceId: string;
  serviceName: string;
  bookingType?: 'INSTANT' | 'SCHEDULED';
  status:
  | 'PENDING'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SEARCHING'
  | 'WORKER_NOT_FOUND';
  pinCode: string;
  scheduledAt: string;
  scheduledEndAt?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  workerAssignedAt?: string | null;
  estimatedArrivalMinutes?: number | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  userLat: number;
  userLng: number;
  userLocation?: string;
  customerAddress?: string;
  servicePincode?: string;
  pincode?: string;
  addressId?: string;
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
    const [token, userId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
    ]);

    if (token) headers.Authorization = `Bearer ${token}`;
    if (userId) headers['X-User-Id'] = userId;
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 20000,
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
  options: RequestInit & { silent?: boolean; timeoutMs?: number; idempotencyKey?: string } = {},
  requiresAuth = true,
): Promise<T> {
  const headers = await getAuthHeaders(requiresAuth);
  const url = `${BASE_URL}${endpoint}`;
  const isSilent = Boolean((options as any)?.silent);
  const timeoutMs =
    (options as any)?.timeoutMs ||
    (endpoint.startsWith('/bookings') ? 60000 : 20000);

  if ((options as any)?.idempotencyKey) {
    headers['X-Idempotency-Key'] = (options as any).idempotencyKey;
  }

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
      timeoutMs,
    );

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          const details = Object.entries(data.fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          message = details ? `${data.message || 'Validation failed'}: ${details}` : (data.message || 'Validation failed');
        } else {
          message = data?.message || data?.error || message;
        }
      } catch {
        // ignore JSON parse errors
      }
      // Do not log 401/403 as console warnings — they are expected auth lifecycle states (e.g. guest or expired session)
      if (!isSilent && response.status !== 401 && response.status !== 403) {
        console.warn(`[API Error] ${endpoint} -> ${response.status}: ${message}`);
        if (response.status === 400) {
          console.warn(`[API Error Details] ${endpoint} -> ${message}`);
        }
      }
      throw new ApiError(response.status, message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    const isCancelledOrTimeout =
      err?.name === 'AbortError' ||
      (typeof err?.message === 'string' &&
        (err.message.toLowerCase().includes('cancel') ||
          err.message.toLowerCase().includes('aborted') ||
          err.message.toLowerCase().includes('timeout')));

    if (isCancelledOrTimeout) {
      if (!isSilent) {
        console.warn(`[API Timeout] Request timed out or was cancelled for ${endpoint}`);
      }
      if (endpoint.startsWith('/bookings')) {
        throw new ApiError(
          408,
          'Booking request took longer than expected to dispatch. Please check "My Bookings" before placing another request.'
        );
      }
      throw new ApiError(408, `Request timed out for ${endpoint}`);
    }
    if (!isSilent) {
      console.warn(`[API Network Error] ${endpoint}:`, err?.message || err);
    }
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
      return await request('/user/me', { silent: true } as any);
    } catch {
      return await request('/user/profile', { silent: true } as any);
    }
  },

  updateProfile: async (data: { fullName?: string; email?: string }): Promise<UserProfile> => {
    let raw: any;
    try {
      raw = await request('/auth/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err?.status === 404) {
        raw = await request('/user/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        throw err;
      }
    }

    const envelope = raw?.data ?? raw;
    const user = envelope?.user ?? envelope;
    return {
      userId: user?.userId ?? user?.id ?? '',
      fullName: user?.fullName ?? user?.name ?? data.fullName ?? '',
      phoneNumber: user?.phoneNumber ?? user?.phone ?? '',
      email: user?.email ?? data.email ?? null,
      role: user?.role ?? 'CUSTOMER',
      createdAt: user?.createdAt ?? new Date().toISOString(),
    };
  },

  registerFcmToken: (fcmToken: string): Promise<{ message: string }> =>
    request('/user/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    }),

  getAddresses: async (): Promise<Address[]> => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      return [];
    }
    try {
      return await request('/user/addresses', { silent: true } as any);
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        return [];
      }
      try {
        return await request('/users/me/addresses', { silent: true } as any);
      } catch {
        return [];
      }
    }
  },

  addAddress: async (data: Omit<Address, 'id' | 'userId'>): Promise<Address> => {
    const payload = {
      title: data.title,
      addressLine: data.addressLine,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      isDefault: Boolean(data.isDefault),
      ...(data.state ? { state: data.state } : {}),
      ...(data.pincode ? { pincode: data.pincode.replace(/\D/g, '') } : {}),
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

  updateAddress: async (
    addressId: string,
    data: {
      title: string;
      addressLine: string;
      city: string;
      lat: number;
      lng: number;
      isDefault?: boolean;
      state?: string;
      pincode?: string;
      userId?: string;
    }
  ): Promise<Address> => {
    const payload = {
      title: data.title,
      addressLine: data.addressLine,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      isDefault: Boolean(data.isDefault),
      ...(data.state ? { state: data.state } : {}),
      ...(data.pincode ? { pincode: data.pincode } : {}),
      ...(data.userId ? { userId: data.userId } : {}),
    };
    try {
      // Primary: PUT /api/v1/user/addresses/{addressId}
      return await request(`/user/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (err?.status === 404) {
        // Fallback: PUT /api/v1/users/me/addresses/{addressId}
        return await request(`/users/me/addresses/${encodeURIComponent(addressId)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      throw err;
    }
  },

  saveBookingAddress: async (data: BookingAddressRequest): Promise<Address> => {
    const payload = {
      label: data.label || 'Office',
      addressLine: data.addressLine,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      // Compatibility fields for backends expecting title/lat/lng
      title: data.label || 'Office',
      lat: data.latitude,
      lng: data.longitude,
      isDefault: false,
      ...(data.state ? { state: data.state } : {}),
      ...(data.pincode ? { pincode: data.pincode } : {}),
    };

    // 1. Try POST /api/users/me/addresses (root /api namespace)
    const rootApiBase = BASE_URL.replace(/\/v1\/?$/, '');
    const headers = await getAuthHeaders(true);

    try {
      const res = await fetchWithTimeout(`${rootApiBase}/users/me/addresses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch { }

    // 2. Try POST /api/v1/users/me/addresses
    try {
      return await request('/users/me/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch { }

    // 3. Fallback to POST /api/v1/user/addresses
    return await request('/user/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Catalog APIs ─────────────────────────────────────────────────────────────
export const catalogApi = {
  getBanners: (): Promise<Banner[]> => request('/banners', {}, false),

  getCoupons: (): Promise<Coupon[]> => request('/coupons', {}, false),

  getExploreServices: async (categoryId?: string): Promise<ExploreServiceItem[]> => {
    const endpoint = categoryId
      ? `/explore-services?categoryId=${encodeURIComponent(categoryId)}`
      : '/explore-services';
    const res = await request(endpoint, {}, false);
    return Array.isArray(res) ? res : [];
  },

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
    return request(`/bookings/time-slots${query}`, {}, false);
  },

  getAvailableDates: async (serviceId?: string, subServiceId?: string, days = 14): Promise<AvailableDate[]> => {
    const params = new URLSearchParams();
    if (serviceId) params.append('serviceId', serviceId);
    if (subServiceId) params.append('subServiceId', subServiceId);
    params.append('days', String(days));
    try {
      return await request(`/bookings/available-dates?${params.toString()}`, { silent: true } as any, false);
    } catch {
      // Fallback: Generate upcoming `days` calendar dates dynamically
      return Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          date: d.toISOString().split('T')[0],
          dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
          monthName: d.toLocaleDateString('en-US', { month: 'short' }),
          dayOfMonth: d.getDate(),
          available: true,
          availableSlotsCount: 9,
        };
      });
    }
  },

  getAvailableSlots: async (date: string, serviceId?: string, subServiceId?: string): Promise<AvailableSlot[]> => {
    const params = new URLSearchParams({ date });
    if (serviceId) params.append('serviceId', serviceId);
    if (subServiceId) params.append('subServiceId', subServiceId);
    try {
      return await request(`/bookings/available-slots?${params.toString()}`, { silent: true } as any, false);
    } catch {
      // Fallback: Query standard /bookings/time-slots endpoint supported by backend
      try {
        const timeSlots = await bookingApi.getTimeSlots(date);
        return timeSlots.map((ts) => {
          const parts = ts.time.split(' - ');
          const isMorning = ts.time.includes('AM');
          const isAfternoon =
            ts.time.includes('PM') &&
            (ts.time.startsWith('12') || ts.time.startsWith('02') || ts.time.startsWith('03'));
          const period: 'MORNING' | 'AFTERNOON' | 'EVENING' = isMorning
            ? 'MORNING'
            : isAfternoon
              ? 'AFTERNOON'
              : 'EVENING';
          return {
            time: ts.time,
            startTime: parts[0] || ts.time,
            endTime: parts[1] || ts.time,
            available: ts.available,
            period,
            availableWorkersCount: 3,
          };
        });
      } catch {
        const defaultTimes = [
          { time: '09:00 AM - 10:00 AM', period: 'MORNING' as const },
          { time: '10:00 AM - 11:00 AM', period: 'MORNING' as const },
          { time: '11:00 AM - 12:00 PM', period: 'MORNING' as const },
          { time: '12:00 PM - 01:00 PM', period: 'AFTERNOON' as const },
          { time: '02:00 PM - 03:00 PM', period: 'AFTERNOON' as const },
          { time: '03:00 PM - 04:00 PM', period: 'AFTERNOON' as const },
          { time: '04:00 PM - 05:00 PM', period: 'EVENING' as const },
          { time: '05:00 PM - 06:00 PM', period: 'EVENING' as const },
          { time: '06:00 PM - 07:00 PM', period: 'EVENING' as const },
        ];
        return defaultTimes.map((t) => {
          const [start, end] = t.time.split(' - ');
          return {
            time: t.time,
            startTime: start,
            endTime: end,
            available: true,
            period: t.period,
            availableWorkersCount: 2,
          };
        });
      }
    }
  },

  getNearbyWorkers: async (
    lat: number,
    lng: number,
    serviceId?: string,
    subServiceId?: string,
    radius?: number
  ): Promise<NearbyWorker[]> => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (serviceId) params.append('serviceId', serviceId);
    if (subServiceId) params.append('subServiceId', subServiceId);
    if (radius) params.append('radius', String(radius));
    try {
      return await request(`/bookings/nearby-workers?${params.toString()}`, { silent: true } as any);
    } catch {
      return [];
    }
  },

  createInstantBooking: (data: BookingRequest): Promise<Booking> => {
    return bookingApi.createBooking({
      ...data,
      bookingType: 'INSTANT',
      scheduledAt: data.scheduledAt || new Date().toISOString(),
    });
  },

  createScheduledBooking: (
    data: BookingRequest & { scheduledDate: string; timeSlot: string }
  ): Promise<Booking> => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanedPin = (data.pincode || '').replace(/\D/g, '');
    if (cleanedPin.length !== 6) {
      throw new ApiError(400, 'Location Not Serviceable: A valid 6-digit PIN code is required to place a booking.');
    }
    const paymentMethod = data.paymentMethod === 'WALLET' ? 'UPI' : (data.paymentMethod || 'COD');
    const userLat = Number(data.userLat) || 17.4485;
    const userLng = Number(data.userLng) || 78.3748;

    let serviceId = data.serviceId;
    if (!UUID_REGEX.test(serviceId)) {
      const fallbackMap: Record<string, string> = {
        electrician: '6e2e370b-7d5e-46d2-944b-afe7c15db6d5',
        cleaning: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
        massage: '6beaaf16-cb8b-4107-9f8b-617b23c0bd21',
        ac: '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760',
      };
      serviceId = fallbackMap[(serviceId || '').toLowerCase()] || '6e2e370b-7d5e-46d2-944b-afe7c15db6d5';
    }

    let subServices =
      Array.isArray(data.subServices)
        ? data.subServices
          .filter((s) => s && s.subServiceId && UUID_REGEX.test(s.subServiceId))
          .map((s) => ({
            subServiceId: s.subServiceId,
            quantity: Math.max(1, Number(s.quantity) || 1),
          }))
        : [];
    if (subServices.length === 0) {
      subServices = [{ subServiceId: '3c391970-28ee-4f28-a566-5c3b48763525', quantity: 1 }];
    }

    const idempotencyKey = data.idempotencyKey || generateUUID();
    const scheduledPayload: any = {
      serviceId,
      userLat,
      userLng,
      paymentMethod,
      pincode: cleanedPin,
      subServices,
      scheduledDate: data.scheduledDate,
      timeSlot: data.timeSlot,
    };

    if (data.addressId && UUID_REGEX.test(data.addressId)) {
      scheduledPayload.addressId = data.addressId;
    }
    if (data.couponCode && data.couponCode.trim()) {
      scheduledPayload.couponCode = data.couponCode.trim().toUpperCase();
    }
    if (Array.isArray(data.addons) && data.addons.length > 0) {
      const validAddons = data.addons
        .filter((a) => a && a.addonId && UUID_REGEX.test(a.addonId))
        .map((a) => ({
          addonId: a.addonId,
          quantity: Math.max(1, Number(a.quantity) || 1),
        }));
      if (validAddons.length > 0) {
        scheduledPayload.addons = validAddons;
      }
    }
    if (data.holdId) scheduledPayload.holdId = data.holdId;
    if (data.lockToken) scheduledPayload.lockToken = data.lockToken;

    if (data.isForFriend) {
      scheduledPayload.isForFriend = true;
      if (data.recipientName && data.recipientName.trim()) {
        scheduledPayload.recipientName = data.recipientName.trim().slice(0, 100);
      }
      if (data.recipientPhone) {
        const cleanedPhone = data.recipientPhone.replace(/[\s-]/g, '');
        if (/^(?:\+91|0)?[6-9]\d{9}$/.test(cleanedPhone)) {
          scheduledPayload.recipientPhone = cleanedPhone;
        }
      }
      if (data.recipientAddress && data.recipientAddress.trim()) {
        scheduledPayload.recipientAddress = data.recipientAddress.trim();
      }
    } else {
      scheduledPayload.isForFriend = false;
    }

    return request('/bookings/scheduled', {
      method: 'POST',
      body: JSON.stringify(scheduledPayload),
      timeoutMs: 60000,
      idempotencyKey,
    } as any);
  },

  getBookingStatus: async (bookingId: string): Promise<any> => {
    try {
      return await request(`/bookings/${bookingId}/status`, { silent: true } as any);
    } catch {
      return await request(`/bookings/${bookingId}`);
    }
  },

  getCapacitySlots: async (
    serviceId: string,
    pincode: string,
    date?: string
  ): Promise<SlotWindow[]> => {
    const cleanPin = (pincode || '').replace(/\D/g, '');
    const params = new URLSearchParams({ serviceId, pincode: cleanPin });
    if (date) params.append('date', date);
    return await request(`/slots?${params.toString()}`);
  },

  holdSlot: async (
    serviceId: string,
    date: string,
    slotTime: string,
    pincode: string,
    userId?: string
  ): Promise<HoldResponse> => {
    const cleanPin = (pincode || '').replace(/\D/g, '');
    return await request('/slot-holds', {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        date,
        slotTime,
        pincode: cleanPin,
        userId,
      }),
    });
  },

  releaseHold: async (holdId: string, lockToken: string): Promise<void> => {
    return await request(`/slot-holds/${holdId}?lockToken=${encodeURIComponent(lockToken)}`, {
      method: 'DELETE',
    });
  },

  rateBooking: async (
    bookingId: string,
    rating: number,
    comment?: string,
    tags?: string[]
  ): Promise<any> => {
    return await request(`/bookings/${bookingId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, tags }),
    });
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

  checkServiceability: async (pincode: string): Promise<ServiceabilityCheckResponse> => {
    const cleaned = (pincode || '').replace(/\D/g, '');
    if (cleaned.length !== 6) {
      return {
        serviceable: false,
        pincode: cleaned,
        city: null,
        state: null,
        message: 'Location Not Serviceable: Please enter a valid 6-digit Indian PIN code.',
      };
    }
    return request(`/serviceability/check?pincode=${encodeURIComponent(cleaned)}`, {}, false);
  },

  createBooking: (data: BookingRequest): Promise<Booking> => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanedPin = (data.pincode || '').replace(/\D/g, '');
    if (cleanedPin.length !== 6) {
      throw new ApiError(400, 'Location Not Serviceable: A valid 6-digit PIN code is required to place a booking.');
    }
    const paymentMethod = data.paymentMethod === 'WALLET' ? 'UPI' : (data.paymentMethod || 'COD');
    const scheduledAt = data.scheduledAt || new Date().toISOString();
    const userLat = Number(data.userLat) || 17.4485;
    const userLng = Number(data.userLng) || 78.3748;

    let serviceId = data.serviceId;
    if (!UUID_REGEX.test(serviceId)) {
      const fallbackMap: Record<string, string> = {
        electrician: '6e2e370b-7d5e-46d2-944b-afe7c15db6d5',
        cleaning: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
        massage: '6beaaf16-cb8b-4107-9f8b-617b23c0bd21',
        ac: '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760',
      };
      serviceId = fallbackMap[(serviceId || '').toLowerCase()] || '6e2e370b-7d5e-46d2-944b-afe7c15db6d5';
    }

    // Ensure subServices is a valid non-empty array with positive integer quantities
    let subServices =
      Array.isArray(data.subServices)
        ? data.subServices
          .filter((s) => s && s.subServiceId && UUID_REGEX.test(s.subServiceId))
          .map((s) => ({
            subServiceId: s.subServiceId,
            quantity: Math.max(1, Number(s.quantity) || 1),
          }))
        : [];
    if (subServices.length === 0) {
      subServices = [{ subServiceId: '3c391970-28ee-4f28-a566-5c3b48763525', quantity: 1 }];
    }

    const idempotencyKey = data.idempotencyKey || generateUUID();

    const cleanedPayload: any = {
      serviceId,
      userLat,
      userLng,
      paymentMethod,
      scheduledAt,
      pincode: cleanedPin,
      subServices,
      bookingType: data.bookingType || 'INSTANT',
    };

    if (data.addressId && UUID_REGEX.test(data.addressId)) {
      cleanedPayload.addressId = data.addressId;
    }

    if (data.couponCode && data.couponCode.trim()) {
      cleanedPayload.couponCode = data.couponCode.trim().toUpperCase();
    }

    if (Array.isArray(data.addons) && data.addons.length > 0) {
      const validAddons = data.addons
        .filter((a) => a && a.addonId && UUID_REGEX.test(a.addonId))
        .map((a) => ({
          addonId: a.addonId,
          quantity: Math.max(1, Number(a.quantity) || 1),
        }));
      if (validAddons.length > 0) {
        cleanedPayload.addons = validAddons;
      }
    }

    if (data.holdId) cleanedPayload.holdId = data.holdId;
    if (data.lockToken) cleanedPayload.lockToken = data.lockToken;
    if (data.timeSlot) cleanedPayload.timeSlot = data.timeSlot;
    if (data.scheduledDate) cleanedPayload.scheduledDate = data.scheduledDate;

    if (data.isForFriend) {
      cleanedPayload.isForFriend = true;
      if (data.recipientName && data.recipientName.trim()) {
        cleanedPayload.recipientName = data.recipientName.trim().slice(0, 100);
      }
      if (data.recipientPhone) {
        const cleanedPhone = data.recipientPhone.replace(/[\s-]/g, '');
        if (/^(?:\+91|0)?[6-9]\d{9}$/.test(cleanedPhone)) {
          cleanedPayload.recipientPhone = cleanedPhone;
        }
      }
      if (data.recipientAddress && data.recipientAddress.trim()) {
        cleanedPayload.recipientAddress = data.recipientAddress.trim();
      }
    } else {
      cleanedPayload.isForFriend = false;
    }

    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify(cleanedPayload),
      timeoutMs: 60000,
      idempotencyKey,
    } as any);
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      return [];
    }
    try {
      return await request('/bookings/my-bookings', { silent: true } as any);
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        return [];
      }
      throw err;
    }
  },

  getBookingById: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}`),

  getServicePin: async (
    bookingId: string
  ): Promise<{ bookingId: string; pinCode: string; status: string; message: string }> => {
    return await request(`/bookings/${encodeURIComponent(bookingId)}/service-pin`);
  },

  cancelBooking: async (bookingId: string, reason = 'Customer requested'): Promise<{ message: string }> => {
    try {
      return await request(`/bookings/${encodeURIComponent(bookingId)}/cancel?reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
      });
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 405) {
        return await request(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      }
      throw err;
    }
  },

  retryMatching: async (
    bookingId: string,
    userLat?: number,
    userLng?: number,
  ): Promise<DispatchTriggerResponse> => {
    try {
      return await request<DispatchTriggerResponse>(
        `/bookings/${bookingId}/retry-matching`,
        {
          method: 'POST',
          body: JSON.stringify({
            bookingId,
            userLat: userLat ?? 17.4485,
            userLng: userLng ?? 78.3748,
          }),
        }
      );
    } catch {
      // Fallback to retry-dispatch endpoint on main backend
      return await request<DispatchTriggerResponse>(
        `/bookings/${bookingId}/retry-dispatch`,
        {
          method: 'POST',
        }
      );
    }
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

// ─── Dispatch Microservice ────────────────────────────────────────────────────
export const DISPATCH_BASE_URL =
  process.env.EXPO_PUBLIC_DISPATCH_API_URL || 'http://3.108.55.219/api/v1';

export interface DispatchTriggerResponse {
  bookingId: string;
  status: 'CANDIDATES_ALERTED' | 'WORKER_NOT_FOUND';
  message: string;
  assignedWorkerId?: string | null;
  pinCode?: string | null;
}

// ─── Live Tracking Service ────────────────────────────────────────────────────
export const TRACKING_BASE_URL =
  process.env.EXPO_PUBLIC_TRACKING_API_URL || 'http://3.108.55.219/api/v1';
export const TRACKING_WS_URL =
  process.env.EXPO_PUBLIC_TRACKING_WS_URL || 'ws://3.108.55.219/ws';

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

  /**
   * Real-time STOMP coordinate stream publisher
   * Destination: /app/tracking/update
   * Payload: { bookingId, lat, lng }
   */
  publishStompCoordinate: (
    stompClient: any,
    bookingId: string,
    lat: number,
    lng: number,
  ): boolean => {
    if (!stompClient || !stompClient.connected) {
      return false;
    }
    try {
      stompClient.publish({
        destination: '/app/tracking/update',
        body: JSON.stringify({ bookingId, lat, lng }),
      });
      return true;
    } catch (e) {
      console.warn('[trackingApi] STOMP publish coordinate error:', e);
      return false;
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

export interface AppUpdateCheckResponse {
  updateAvailable: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  minimumVersion: string;
  releaseNotes: string;
  storeUrl: string;
  appType: string;
}

export const systemApi = {
  checkAppUpdate: async (
    currentVersion = '1.0.0',
    platform: 'android' | 'ios' | string = 'android'
  ): Promise<AppUpdateCheckResponse> => {
    const query = `appType=CUSTOMER&currentVersion=${encodeURIComponent(currentVersion)}&platform=${encodeURIComponent(platform.toLowerCase())}`;
    try {
      // Primary: GET /api/v1/app/check-update
      return await request(`/app/check-update?${query}`, {}, false);
    } catch (err: any) {
      if (err?.status === 404) {
        // Fallback: GET /api/app/check-update (root namespace)
        const rootBase = BASE_URL.replace(/\/v1\/?$/, '');
        const res = await fetchWithTimeout(`${rootBase}/app/check-update?${query}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          return await res.json();
        }
      }
      throw err;
    }
  },
};

// ─── Dynamic Service Detail & Server Cart APIs ───────────────────────────────

export interface ServiceDurationItem {
  durationId: string;
  minutes: number;
  label: string;
  price: number;
  originalPrice?: number | null;
  isPopular?: boolean;
  active: boolean;
  displayOrder: number;
}

export interface ServicePackageItem {
  packageId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  durationMins: number;
  inclusions: string[];
  active: boolean;
  displayOrder: number;
}

export interface ServiceFeatureItem {
  featureId: string;
  title: string;
  description?: string;
  iconUrl?: string;
  isIncluded: boolean;
  displayOrder: number;
}

export interface ServiceHowItWorksItem {
  stepId: string;
  stepNumber: number;
  title: string;
  description?: string;
  iconUrl?: string;
}

export interface ServiceInstructionItem {
  instructionId: string;
  title: string;
  description?: string;
  displayOrder: number;
}

export interface ServiceImageItem {
  imageId: string;
  imageUrl: string;
  caption?: string;
  isBanner?: boolean;
  displayOrder: number;
}

export interface ServiceAvailabilityInfo {
  isAvailableNow: boolean;
  nextAvailableSlot: string;
  instantEtaMinutes: number;
}

export interface DynamicServiceDetail {
  serviceId: string;
  serviceName: string;
  subtitle?: string;
  description: string;
  bannerImage: string;
  rating: number;
  totalReviews: number;
  startingPrice: number;
  bookingTypes: string[];
  cancellationPolicy: string;
  serviceAvailability: ServiceAvailabilityInfo;
  durations: ServiceDurationItem[];
  packages: ServicePackageItem[];
  features: ServiceFeatureItem[];
  howItWorks: ServiceHowItWorksItem[];
  instructions: ServiceInstructionItem[];
  galleryImages: ServiceImageItem[];
  subServices: SubService[];
}

export interface ServerCartItem {
  cartItemId: string;
  serviceId: string;
  serviceName: string;
  durationId?: string;
  durationLabel?: string;
  durationMinutes?: number;
  packageId?: string;
  packageName?: string;
  subServiceId?: string;
  subServiceName?: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  itemTotal: number;
  imageUrl?: string;
  notes?: string;
}

export interface ServerCartResponse {
  cartId: string;
  userId: string;
  items: ServerCartItem[];
  totalQuantity: number;
  subtotal: number;
  additionalCharges: number;
  taxAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
  couponCode?: string | null;
}

export interface ServerCartSummaryResponse {
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
}

export interface AddToServerCartRequest {
  serviceId: string;
  durationId?: string;
  packageId?: string;
  subServiceId?: string;
  quantity?: number;
  notes?: string;
}

export interface CheckoutFromCartPayload {
  bookingType: 'INSTANT' | 'SCHEDULED';
  userLat: number;
  userLng: number;
  address: string;
  pincode: string;
  paymentMethod: 'COD' | 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET';
  scheduledDate?: string;
  timeSlot?: string;
  couponCode?: string;
  isForFriend?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  idempotencyKey?: string;
}

export const serviceDetailApi = {
  /**
   * GET /api/v1/services/{serviceId}
   * Fetches complete dynamic service detail (durations, packages, how it works, features)
   */
  getServiceDetail: async (serviceId: string): Promise<DynamicServiceDetail> => {
    return await request<DynamicServiceDetail>(`/services/${serviceId}`, {}, false);
  },
};

export const cartApi = {
  /**
   * GET /api/v1/cart
   */
  getCart: async (couponCode?: string): Promise<ServerCartResponse> => {
    const query = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : '';
    return await request<ServerCartResponse>(`/cart${query}`, {}, true);
  },

  /**
   * POST /api/v1/cart/items
   */
  addToCart: async (payload: AddToServerCartRequest): Promise<ServerCartResponse> => {
    return await request<ServerCartResponse>(
      '/cart/items',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /**
   * PUT /api/v1/cart/items/{itemId}
   */
  updateCartItem: async (itemId: string, quantity: number, notes?: string): Promise<ServerCartResponse> => {
    return await request<ServerCartResponse>(
      `/cart/items/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ quantity, notes }),
      },
      true
    );
  },

  /**
   * DELETE /api/v1/cart/items/{itemId}
   */
  removeCartItem: async (itemId: string): Promise<ServerCartResponse> => {
    return await request<ServerCartResponse>(
      `/cart/items/${itemId}`,
      { method: 'DELETE' },
      true
    );
  },

  /**
   * DELETE /api/v1/cart
   */
  clearCart: async (): Promise<{ message: string }> => {
    return await request<{ message: string }>(
      '/cart',
      { method: 'DELETE' },
      true
    );
  },

  /**
   * GET /api/v1/cart/summary
   */
  getSummary: async (couponCode?: string): Promise<ServerCartSummaryResponse> => {
    const query = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : '';
    return await request<ServerCartSummaryResponse>(`/cart/summary${query}`, {}, true);
  },

  /**
   * POST /api/v1/cart/checkout
   */
  checkout: async (payload: CheckoutFromCartPayload): Promise<Booking> => {
    return await request<Booking>(
      '/cart/checkout',
      {
        method: 'POST',
        body: JSON.stringify(payload),
        idempotencyKey: payload.idempotencyKey,
      },
      true
    );
  },
};

