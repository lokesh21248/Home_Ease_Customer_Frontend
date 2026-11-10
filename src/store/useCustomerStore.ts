/**
 * useCustomerStore.ts - Zustand State Management for HomeEase Customer App
 *
 * Provides reactive, type-safe global state across:
 * - Authentication & User Profile
 * - Selected Location & Service Address
 * - Cart & Multi-Step Booking
 * - Live Tracking & Doorstep Verification PIN
 * - UI & Bottom Sheet coordination
 *
 * Coexists harmoniously with existing React Contexts and TanStack Query without breaking flows.
 */

import { create } from 'zustand';
import {
  UserProfile,
  Address,
  ServiceCategory,
  SubService,
  Addon,
  TimeSlot,
  CouponValidationResponse,
  HoldResponse,
} from '../api/client';
import { CartSubService, PaymentMethod } from '../context/CartContext';

export interface CustomerStoreState {
  // ── Authentication & Profile ──
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  user: UserProfile | null;
  setAuth: (token: string | null, userId: string | null, user: UserProfile | null) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  clearAuth: () => void;

  // ── Location & Address ──
  selectedAddress: Address | null;
  currentLocation: {
    latitude: number;
    longitude: number;
    locality?: string;
    city?: string;
  } | null;
  setSelectedAddress: (address: Address | null) => void;
  setCurrentLocation: (loc: { latitude: number; longitude: number; locality?: string; city?: string } | null) => void;

  // ── Cart & Booking ──
  category: ServiceCategory | null;
  cartItems: CartSubService[];
  selectedDate: string | null;
  selectedSlot: TimeSlot | null;
  bookingType: 'INSTANT' | 'SCHEDULED';
  activeHold: HoldResponse | null;
  coupon: CouponValidationResponse | null;
  paymentMethod: PaymentMethod;
  setCategory: (category: ServiceCategory | null) => void;
  setCartItems: (items: CartSubService[]) => void;
  addToCart: (subService: SubService, addons?: Addon[]) => void;
  removeFromCart: (subServiceId: string) => void;
  updateQuantity: (subServiceId: string, quantity: number) => void;
  clearCart: () => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  setBookingType: (type: 'INSTANT' | 'SCHEDULED') => void;
  setCoupon: (coupon: CouponValidationResponse | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;

  // ── Live Tracking & Doorstep PIN ──
  activeBookingId: string | null;
  workerLocation: { lat: number; lng: number; bearing?: number } | null;
  trackingStatus: string | null;
  doorstepPin: string | null;
  setActiveBookingId: (id: string | null) => void;
  setWorkerLocation: (loc: { lat: number; lng: number; bearing?: number } | null) => void;
  setTrackingStatus: (status: string | null) => void;
  setDoorstepPin: (pin: string | null) => void;

  // ── Global UI & Bottom Sheet ──
  activeSheet: string | null;
  sheetPayload: any;
  openBottomSheet: (sheetId: string, payload?: any) => void;
  closeBottomSheet: () => void;
}

export const useCustomerStore = create<CustomerStoreState>((set) => ({
  // Auth initial state
  isAuthenticated: false,
  token: null,
  userId: null,
  user: null,
  setAuth: (token, userId, user) =>
    set({
      token,
      userId,
      user,
      isAuthenticated: Boolean(token && userId),
    }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
  clearAuth: () =>
    set({
      isAuthenticated: false,
      token: null,
      userId: null,
      user: null,
    }),

  // Location initial state
  selectedAddress: null,
  currentLocation: null,
  setSelectedAddress: (selectedAddress) => set({ selectedAddress }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),

  // Cart initial state
  category: null,
  cartItems: [],
  selectedDate: null,
  selectedSlot: null,
  bookingType: 'INSTANT',
  activeHold: null,
  coupon: null,
  paymentMethod: 'UPI',
  setCategory: (category) => set({ category }),
  setCartItems: (cartItems) => set({ cartItems }),
  addToCart: (subService, addons = []) =>
    set((state) => {
      const existingIdx = state.cartItems.findIndex(
        (item) => item.subService.subServiceId === subService.subServiceId
      );
      if (existingIdx >= 0) {
        const next = [...state.cartItems];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return { cartItems: next };
      }
      return {
        cartItems: [
          ...state.cartItems,
          {
            subService,
            quantity: 1,
            selectedAddons: addons.map((a) => ({ addon: a, quantity: 1 })),
          },
        ],
      };
    }),
  removeFromCart: (subServiceId) =>
    set((state) => ({
      cartItems: state.cartItems.filter(
        (item) => item.subService.subServiceId !== subServiceId
      ),
    })),
  updateQuantity: (subServiceId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return {
          cartItems: state.cartItems.filter(
            (item) => item.subService.subServiceId !== subServiceId
          ),
        };
      }
      return {
        cartItems: state.cartItems.map((item) =>
          item.subService.subServiceId === subServiceId
            ? { ...item, quantity }
            : item
        ),
      };
    }),
  clearCart: () =>
    set({
      cartItems: [],
      category: null,
      selectedDate: null,
      selectedSlot: null,
      coupon: null,
      activeHold: null,
    }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setBookingType: (bookingType) => set({ bookingType }),
  setCoupon: (coupon) => set({ coupon }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  // Tracking initial state
  activeBookingId: null,
  workerLocation: null,
  trackingStatus: null,
  doorstepPin: null,
  setActiveBookingId: (activeBookingId) => set({ activeBookingId }),
  setWorkerLocation: (workerLocation) => set({ workerLocation }),
  setTrackingStatus: (trackingStatus) => set({ trackingStatus }),
  setDoorstepPin: (doorstepPin) => set({ doorstepPin }),

  // UI / Bottom Sheet initial state
  activeSheet: null,
  sheetPayload: null,
  openBottomSheet: (activeSheet, sheetPayload = null) =>
    set({ activeSheet, sheetPayload }),
  closeBottomSheet: () => set({ activeSheet: null, sheetPayload: null }),
}));

