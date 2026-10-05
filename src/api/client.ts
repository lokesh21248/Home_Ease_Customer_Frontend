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

export const BASE_URL = 'http://3.107.161.126:8080/api/v1';

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
  lat: number;
  lng: number;
  isDefault: boolean;
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
  paymentMethod: 'COD' | 'UPI' | 'CARD' | 'NET_BANKING';
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
  status: 'SEARCHING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pinCode: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  userLat: number;
  userLng: number;
  baseAmount: number;
  extraAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthHeaders(requiresAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const [token, userId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
    ]);

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['X-User-Id'] = userId;
  }

  return headers;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = await getAuthHeaders(requiresAuth);
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ─── Auth APIs ────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phoneNumber: string): Promise<OtpSendResponse> =>
    request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }, false),

  verifyOtp: (phoneNumber: string, otpCode: string): Promise<AuthResponse> =>
    request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otpCode }),
    }, false),

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
  getProfile: (): Promise<UserProfile> => request('/user/profile'),

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

  getAddresses: (): Promise<Address[]> => request('/user/addresses'),

  addAddress: (data: Omit<Address, 'id' | 'userId'>): Promise<Address> =>
    request('/user/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAddress: (addressId: string): Promise<{ message: string }> =>
    request(`/user/addresses/${addressId}`, { method: 'DELETE' }),
};

// ─── Catalog APIs ─────────────────────────────────────────────────────────────
export const catalogApi = {
  getBanners: (): Promise<Banner[]> => request('/banners', {}, false),

  getCategories: (): Promise<ServiceCategory[]> => request('/categories', {}, false),

  getSubServices: (serviceId: string): Promise<SubService[]> =>
    request(`/services/${serviceId}/sub-services`, {}, false),
};

// ─── Booking APIs ─────────────────────────────────────────────────────────────
export const bookingApi = {
  getTimeSlots: (date?: string): Promise<TimeSlot[]> => {
    const query = date ? `?date=${date}` : '';
    return request(`/bookings/time-slots${query}`);
  },

  validateCoupon: (code: string, cartTotal: number): Promise<CouponValidationResponse> =>
    request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal }),
    }),

  createBooking: (data: BookingRequest): Promise<Booking> =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyBookings: (): Promise<Booking[]> => request('/bookings/my-bookings'),

  getBookingById: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}`),
};

export { ApiError };
