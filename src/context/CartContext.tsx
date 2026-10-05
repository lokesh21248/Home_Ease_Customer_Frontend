/**
 * BookingCartContext — manages service selection, addons,
 * address, time slot, coupon, and payment method state
 * across the multi-step booking flow.
 */

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  ServiceCategory,
  SubService,
  Addon,
  Address,
  TimeSlot,
  CouponValidationResponse,
} from '../api/client';

// ─── Cart Item Types ──────────────────────────────────────────────────────────
export interface CartSubService {
  subService: SubService;
  quantity: number;
  selectedAddons: { addon: Addon; quantity: number }[];
}

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING';

// ─── Cart State ───────────────────────────────────────────────────────────────
interface CartState {
  category: ServiceCategory | null;
  items: CartSubService[];
  selectedAddress: Address | null;
  selectedSlot: TimeSlot | null;
  selectedDate: string | null;
  coupon: CouponValidationResponse | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
}

const initialState: CartState = {
  category: null,
  items: [],
  selectedAddress: null,
  selectedSlot: null,
  selectedDate: null,
  coupon: null,
  paymentMethod: 'COD',
  subtotal: 0,
  discount: 0,
  total: 0,
};

// ─── Actions ──────────────────────────────────────────────────────────────────
type CartAction =
  | { type: 'SET_CATEGORY'; payload: ServiceCategory }
  | { type: 'ADD_SUB_SERVICE'; payload: SubService }
  | { type: 'REMOVE_SUB_SERVICE'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { subServiceId: string; quantity: number } }
  | { type: 'TOGGLE_ADDON'; payload: { subServiceId: string; addon: Addon } }
  | { type: 'SET_ADDRESS'; payload: Address }
  | { type: 'SET_SLOT'; payload: { slot: TimeSlot; date: string } }
  | { type: 'SET_COUPON'; payload: CouponValidationResponse | null }
  | { type: 'SET_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'CLEAR_CART' };

function computeTotals(
  items: CartSubService[],
  coupon: CouponValidationResponse | null,
): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce((sum, item) => {
    const base = item.subService.basePrice * item.quantity;
    const addonsTotal = item.selectedAddons.reduce(
      (a, { addon, quantity }) => a + addon.price * quantity,
      0,
    );
    return sum + base + addonsTotal;
  }, 0);

  const discount = coupon ? coupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  return { subtotal, discount, total };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...initialState, category: action.payload };

    case 'ADD_SUB_SERVICE': {
      const exists = state.items.some(
        (i) => i.subService.subServiceId === action.payload.subServiceId,
      );
      if (exists) return state;
      const newItems = [
        ...state.items,
        { subService: action.payload, quantity: 1, selectedAddons: [] },
      ];
      return { ...state, items: newItems, ...computeTotals(newItems, state.coupon) };
    }

    case 'REMOVE_SUB_SERVICE': {
      const newItems = state.items.filter(
        (i) => i.subService.subServiceId !== action.payload,
      );
      return { ...state, items: newItems, ...computeTotals(newItems, state.coupon) };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map((i) =>
        i.subService.subServiceId === action.payload.subServiceId
          ? { ...i, quantity: Math.max(1, action.payload.quantity) }
          : i,
      );
      return { ...state, items: newItems, ...computeTotals(newItems, state.coupon) };
    }

    case 'TOGGLE_ADDON': {
      const newItems = state.items.map((item) => {
        if (item.subService.subServiceId !== action.payload.subServiceId) return item;
        const addonIdx = item.selectedAddons.findIndex(
          (a) => a.addon.addonId === action.payload.addon.addonId,
        );
        const updatedAddons =
          addonIdx >= 0
            ? item.selectedAddons.filter((_, i) => i !== addonIdx)
            : [...item.selectedAddons, { addon: action.payload.addon, quantity: 1 }];
        return { ...item, selectedAddons: updatedAddons };
      });
      return { ...state, items: newItems, ...computeTotals(newItems, state.coupon) };
    }

    case 'SET_ADDRESS':
      return { ...state, selectedAddress: action.payload };

    case 'SET_SLOT':
      return { ...state, selectedSlot: action.payload.slot, selectedDate: action.payload.date };

    case 'SET_COUPON': {
      const coupon = action.payload;
      return { ...state, coupon, ...computeTotals(state.items, coupon) };
    }

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };

    case 'CLEAR_CART':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface CartContextValue {
  cart: CartState;
  setCategory: (c: ServiceCategory) => void;
  addSubService: (s: SubService) => void;
  removeSubService: (id: string) => void;
  updateQuantity: (subServiceId: string, quantity: number) => void;
  toggleAddon: (subServiceId: string, addon: Addon) => void;
  setAddress: (a: Address) => void;
  setSlot: (slot: TimeSlot, date: string) => void;
  setCoupon: (c: CouponValidationResponse | null) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  clearCart: () => void;
  isSubServiceSelected: (id: string) => boolean;
  isAddonSelected: (subServiceId: string, addonId: string) => boolean;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  const setCategory = useCallback((c: ServiceCategory) => dispatch({ type: 'SET_CATEGORY', payload: c }), []);
  const addSubService = useCallback((s: SubService) => dispatch({ type: 'ADD_SUB_SERVICE', payload: s }), []);
  const removeSubService = useCallback((id: string) => dispatch({ type: 'REMOVE_SUB_SERVICE', payload: id }), []);
  const updateQuantity = useCallback((subServiceId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { subServiceId, quantity } }), []);
  const toggleAddon = useCallback((subServiceId: string, addon: Addon) =>
    dispatch({ type: 'TOGGLE_ADDON', payload: { subServiceId, addon } }), []);
  const setAddress = useCallback((a: Address) => dispatch({ type: 'SET_ADDRESS', payload: a }), []);
  const setSlot = useCallback((slot: TimeSlot, date: string) =>
    dispatch({ type: 'SET_SLOT', payload: { slot, date } }), []);
  const setCoupon = useCallback((c: CouponValidationResponse | null) =>
    dispatch({ type: 'SET_COUPON', payload: c }), []);
  const setPaymentMethod = useCallback((m: PaymentMethod) =>
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: m }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);

  const isSubServiceSelected = useCallback(
    (id: string) => cart.items.some((i) => i.subService.subServiceId === id),
    [cart.items],
  );

  const isAddonSelected = useCallback(
    (subServiceId: string, addonId: string) => {
      const item = cart.items.find((i) => i.subService.subServiceId === subServiceId);
      return !!item?.selectedAddons.some((a) => a.addon.addonId === addonId);
    },
    [cart.items],
  );

  const itemCount = cart.items.length;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      setCategory,
      addSubService,
      removeSubService,
      updateQuantity,
      toggleAddon,
      setAddress,
      setSlot,
      setCoupon,
      setPaymentMethod,
      clearCart,
      isSubServiceSelected,
      isAddonSelected,
      itemCount,
    }),
    [
      cart,
      setCategory,
      addSubService,
      removeSubService,
      updateQuantity,
      toggleAddon,
      setAddress,
      setSlot,
      setCoupon,
      setPaymentMethod,
      clearCart,
      isSubServiceSelected,
      isAddonSelected,
      itemCount,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
