import apiClient from './axiosInstance';
import { Booking, BookingStatus, TimeSlot } from '../types';
import { MOCK_BOOKINGS, MOCK_ADDRESSES } from '../constants/mockData';
import { toValidUUID, generateUUID, formatDateToYYYYMMDD } from '../utils/uuid';

export interface CreateBookingPayload {
  serviceId: string;
  subServices?: { subServiceId: string; quantity: number }[];
  addons?: { addonId: string; quantity: number }[];
  couponCode?: string;
  scheduledAt: string; // ISO 8601 string
  userLat?: number;
  userLng?: number;
  paymentMethod: 'ONLINE' | 'CASH' | 'WALLET' | string;
  // Compatibility inputs
  serviceName?: string;
  serviceImage?: string;
  package?: any;
  address?: any;
  date?: string;
  timeSlot?: string;
  payment?: any;
  professional?: any;
}

export interface ValidateCouponResponse {
  isValid: boolean;
  code: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountVal?: number;
  calculatedDiscount?: number;
  message: string;
}

let localBookings = [...MOCK_BOOKINGS];

function parsePeriodFromTime(timeStr: string): 'Morning' | 'Afternoon' | 'Evening' {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 'Morning';
  let hour = parseInt(match[1], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (hour < 12) return 'Morning';
  if (hour < 16) return 'Afternoon';
  return 'Evening';
}

function normalizeBooking(b: any, fallbackPayload?: any): Booking {
  const bookingId = toValidUUID(b.bookingId || b.id || fallbackPayload?.id);
  const scheduledIso = b.scheduledAt || fallbackPayload?.scheduledAt || new Date().toISOString();
  const dateStr =
    b.date ||
    fallbackPayload?.date ||
    new Date(scheduledIso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    id: bookingId,
    bookingId,
    userId: b.userId ? toValidUUID(b.userId) : fallbackPayload?.userId,
    userName: b.userName || fallbackPayload?.userName,
    userPhone: b.userPhone || fallbackPayload?.userPhone,
    workerId: b.workerId ? toValidUUID(b.workerId) : fallbackPayload?.workerId || null,
    workerName: b.workerName || fallbackPayload?.workerName || 'Raj Kumar',
    workerPhone: b.workerPhone || fallbackPayload?.workerPhone || '+91 91234 56780',
    serviceId: toValidUUID(b.serviceId || fallbackPayload?.serviceId),
    serviceName: b.serviceName || fallbackPayload?.serviceName || 'Home Service',
    serviceImage:
      b.serviceImage ||
      fallbackPayload?.serviceImage ||
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    status: (b.status || fallbackPayload?.status || 'SEARCHING_WORKER') as BookingStatus,
    pinCode: b.pinCode || fallbackPayload?.pinCode || '4821', // 4-digit security PIN
    scheduledAt: scheduledIso,
    startedAt: b.startedAt || null,
    completedAt: b.completedAt || null,
    userLat: Number(b.userLat || fallbackPayload?.userLat || 17.448293),
    userLng: Number(b.userLng || fallbackPayload?.userLng || 78.374182),
    totalAmount: Number(b.totalAmount ?? fallbackPayload?.payment?.total ?? 1214),
    paymentStatus: b.paymentStatus || 'COMPLETED',
    paymentMethod: b.paymentMethod || fallbackPayload?.paymentMethod || 'ONLINE',
    date: dateStr,
    timeSlot: b.timeSlot || fallbackPayload?.timeSlot || '10:00 AM – 12:00 PM',
    address: fallbackPayload?.address || b.address || MOCK_ADDRESSES[0],
    package: fallbackPayload?.package,
    subServices: b.subServices || fallbackPayload?.subServices,
    addons: b.addons || fallbackPayload?.addons,
    payment: fallbackPayload?.payment || {
      method: b.paymentMethod || 'UPI',
      status: b.paymentStatus === 'COMPLETED' ? 'success' : 'pending',
      subtotal: b.baseAmount || 999,
      platformFee: 30,
      taxes: 185,
      discount: b.discountAmount || 0,
      total: b.totalAmount || 1214,
    },
    professional: fallbackPayload?.professional || {
      id: toValidUUID(b.workerId, '6f2e1a3b-4c5d-6e7f-6a9b-1c2d3e4f5a6b'),
      name: b.workerName || 'Raj Kumar',
      role: 'Home Cleaning Professional',
      rating: 4.9,
      reviewsCount: 320,
      phone: b.workerPhone || '+91 91234 56780',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      badge: 'Top Rated Pro',
      completedJobsCount: 480,
    },
    createdAt: b.createdAt || dateStr,
  };
}

export const bookingApi = {
  // POST /coupons/validate
  validateCoupon: async (code: string, orderValue: number): Promise<ValidateCouponResponse> => {
    try {
      const res = await apiClient.post<ValidateCouponResponse>('/coupons/validate', {
        code: code.trim().toUpperCase(),
        orderValue,
      });
      return res.data;
    } catch {
      const clean = code.trim().toUpperCase();
      if (clean === 'WELCOME50' || clean === 'DIWALI50') {
        const disc = Math.round(orderValue * 0.2);
        return {
          isValid: true,
          code: clean,
          discountType: 'PERCENTAGE',
          discountVal: 20,
          calculatedDiscount: disc,
          message: 'Coupon applied successfully',
        };
      }
      return {
        isValid: false,
        code: clean,
        message: 'Coupon code is invalid or expired',
      };
    }
  },

  // GET /bookings/my-bookings
  getMyBookings: async (status?: BookingStatus): Promise<Booking[]> => {
    try {
      const res = await apiClient.get<any>('/bookings/my-bookings');
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data && Array.isArray(res.data.data)
        ? res.data.data
        : res.data?.bookings && Array.isArray(res.data.bookings)
        ? res.data.bookings
        : [];

      if (list.length > 0) {
        const parsed = list.map((b: any) => normalizeBooking(b));
        if (status) {
          const s = status.toUpperCase();
          return parsed.filter((b: any) => {
            const bs = (b.status || '').toUpperCase();
            if (s === 'ACTIVE') return ['ACTIVE', 'IN_PROGRESS', 'ACCEPTED', 'SEARCHING_WORKER'].includes(bs);
            if (s === 'UPCOMING') return ['UPCOMING', 'CONFIRMED', 'PENDING'].includes(bs);
            if (s === 'COMPLETED') return bs === 'COMPLETED';
            if (s === 'CANCELLED') return bs === 'CANCELLED';
            return bs === s;
          });
        }
        return parsed;
      }
      return filterLocalBookings(status);
    } catch {
      return filterLocalBookings(status);
    }
  },

  // Backwards compatibility alias
  getBookings: async (status?: BookingStatus): Promise<Booking[]> => {
    return bookingApi.getMyBookings(status);
  },

  // GET /bookings/{bookingId}
  getBookingById: async (bookingId: string): Promise<Booking | undefined> => {
    const validBookingId = toValidUUID(bookingId);
    try {
      const res = await apiClient.get<any>(`/bookings/${validBookingId}`);
      const b = res.data?.data || res.data;
      if (b && (b.bookingId || b.id || b.serviceId)) {
        return normalizeBooking(b);
      }
      return localBookings.find((item) => item.id === validBookingId || item.id === bookingId);
    } catch {
      return localBookings.find((item) => item.id === validBookingId || item.id === bookingId);
    }
  },

  // POST /bookings
  createBooking: async (payload: any): Promise<Booking> => {
    let backendPaymentMethod = 'ONLINE';
    if (payload.paymentMethod === 'Cash' || payload.paymentMethod === 'CASH') {
      backendPaymentMethod = 'CASH';
    } else if (payload.paymentMethod === 'Wallet' || payload.paymentMethod === 'WALLET') {
      backendPaymentMethod = 'WALLET';
    }

    const subServices =
      payload.subServices && payload.subServices.length > 0
        ? payload.subServices.map((s: any) => ({
            subServiceId: toValidUUID(s.subServiceId || s.id),
            quantity: s.quantity || 1,
          }))
        : payload.package
        ? [{ subServiceId: toValidUUID(payload.package.id), quantity: 1 }]
        : [];

    const addons =
      payload.addons && payload.addons.length > 0
        ? payload.addons.map((a: any) => ({
            addonId: toValidUUID(a.addonId || a.id),
            quantity: a.quantity || 1,
          }))
        : [];

    const requestBody = {
      serviceId: toValidUUID(payload.serviceId),
      subServices: subServices.length > 0 ? subServices : undefined,
      addons: addons.length > 0 ? addons : undefined,
      couponCode: payload.couponCode?.trim() || undefined,
      scheduledAt: payload.scheduledAt || new Date().toISOString(),
      userLat: Number(payload.userLat || payload.address?.lat || payload.address?.coordinates?.latitude || 17.448293),
      userLng: Number(payload.userLng || payload.address?.lng || payload.address?.coordinates?.longitude || 78.374182),
      paymentMethod: backendPaymentMethod,
    };

    try {
      const res = await apiClient.post<any>('/bookings', requestBody);
      const b = res.data?.data || res.data;
      const created = normalizeBooking(b, { ...payload, ...requestBody });
      localBookings.unshift(created);
      return created;
    } catch {
      // Offline fallback with strictly valid 36-char UUID
      const generatedBookingId = generateUUID();
      const newBooking: Booking = normalizeBooking(
        {
          id: generatedBookingId,
          bookingId: generatedBookingId,
          status: 'SEARCHING_WORKER',
          pinCode: '4821',
          paymentStatus: 'COMPLETED',
          paymentMethod: backendPaymentMethod,
          totalAmount: payload.payment?.total || 1214,
        },
        payload
      );
      localBookings.unshift(newBooking);
      return newBooking;
    }
  },

  // POST /bookings/{id}/cancel
  cancelBooking: async (id: string, reason?: string): Promise<boolean> => {
    const validId = toValidUUID(id);
    try {
      await apiClient.post(`/bookings/${validId}/cancel`, { reason });
      localBookings = localBookings.map((b) =>
        b.id === validId || b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b
      );
      return true;
    } catch {
      localBookings = localBookings.map((b) =>
        b.id === validId || b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b
      );
      return true;
    }
  },

  // POST /bookings/{id}/reschedule
  rescheduleBooking: async (id: string, date: string, timeSlot: string): Promise<Booking> => {
    const validId = toValidUUID(id);
    const formattedDate = formatDateToYYYYMMDD(date);
    try {
      const res = await apiClient.post<any>(`/bookings/${validId}/reschedule`, {
        date: formattedDate,
        timeSlot,
      });
      return normalizeBooking(res.data?.data || res.data);
    } catch {
      localBookings = localBookings.map((b) =>
        b.id === validId || b.id === id ? { ...b, date, timeSlot } : b
      );
      return localBookings.find((b) => b.id === validId || b.id === id)!;
    }
  },

  // GET /bookings/time-slots?date=YYYY-MM-DD (or GET /slots)
  getTimeSlots: async (dateInput: string): Promise<TimeSlot[]> => {
    const formattedDate = formatDateToYYYYMMDD(dateInput);

    let rawList: any[] = [];
    try {
      let res;
      try {
        res = await apiClient.get<any>('/bookings/time-slots', {
          params: { date: formattedDate },
        });
      } catch {
        res = await apiClient.get<any>('/slots', {
          params: { date: formattedDate },
        });
      }

      rawList = Array.isArray(res.data)
        ? res.data
        : res.data?.data && Array.isArray(res.data.data)
        ? res.data.data
        : res.data?.slots && Array.isArray(res.data.slots)
        ? res.data.slots
        : [];
    } catch {
      rawList = [];
    }

    if (rawList.length > 0) {
      return rawList.map((item: any, idx: number) => {
        const timeStr = item.time || `${String(9 + idx).padStart(2, '0')}:00 AM - ${String(10 + idx).padStart(2, '0')}:00 AM`;
        const isAvailable = item.available !== false && item.isAvailable !== false;
        return {
          id: item.id || `slot-${formattedDate}-${idx}`,
          time: timeStr,
          period: item.period || parsePeriodFromTime(timeStr),
          isAvailable,
          available: isAvailable,
          date: item.date || formattedDate,
        };
      });
    }

    // Default fallback slots for formatted date
    return [
      { id: `slot-${formattedDate}-0`, period: 'Morning', time: '09:00 AM - 10:00 AM', isAvailable: true },
      { id: `slot-${formattedDate}-1`, period: 'Morning', time: '10:00 AM - 11:00 AM', isAvailable: true },
      { id: `slot-${formattedDate}-2`, period: 'Morning', time: '11:00 AM - 12:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-3`, period: 'Afternoon', time: '12:00 PM - 01:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-4`, period: 'Afternoon', time: '02:00 PM - 03:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-5`, period: 'Afternoon', time: '03:00 PM - 04:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-6`, period: 'Evening', time: '04:00 PM - 05:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-7`, period: 'Evening', time: '05:00 PM - 06:00 PM', isAvailable: true },
      { id: `slot-${formattedDate}-8`, period: 'Evening', time: '06:00 PM - 07:00 PM', isAvailable: false },
    ];
  },
};

function filterLocalBookings(status?: BookingStatus): Booking[] {
  if (!status) return localBookings;
  const s = status.toUpperCase();
  return localBookings.filter((b) => {
    const bs = (b.status || '').toUpperCase();
    if (s === 'ACTIVE') return ['ACTIVE', 'IN_PROGRESS', 'ACCEPTED', 'SEARCHING_WORKER'].includes(bs);
    if (s === 'UPCOMING') return ['UPCOMING', 'CONFIRMED', 'PENDING'].includes(bs);
    if (s === 'COMPLETED') return bs === 'COMPLETED';
    if (s === 'CANCELLED') return bs === 'CANCELLED';
    return bs === s;
  });
}
