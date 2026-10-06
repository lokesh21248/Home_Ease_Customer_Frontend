import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Service, ServicePackage, Address, Coupon, Booking, BookingStatus, SubService, Addon } from '../types';
import { bookingApi } from '../api/bookingApi';
import { addressApi } from '../api/addressApi';
import { MOCK_ADDRESSES, MOCK_SERVICES } from '../constants/mockData';

interface PricingBreakdown {
  subtotal: number;
  platformFee: number;
  taxes: number;
  discount: number;
  total: number;
}

interface BookingContextType {
  selectedService: Service | null;
  selectedPackage: ServicePackage | null;
  selectedSubServices: SubService[];
  selectedAddons: Addon[];
  selectedAddress: Address | null;
  selectedDate: string;
  selectedTimeSlot: string;
  appliedCoupon: Coupon | null;
  pricing: PricingBreakdown;
  bookings: Booking[];
  isLoadingBookings: boolean;
  setService: (service: Service) => void;
  setPackage: (pkg: ServicePackage | null) => void;
  setSubServices: (subServices: SubService[]) => void;
  setAddons: (addons: Addon[]) => void;
  setAddress: (address: Address) => void;
  setDateTime: (date: string, timeSlot: string) => void;
  applyCoupon: (coupon: Coupon) => boolean;
  removeCoupon: () => void;
  clearBookingDraft: () => void;
  refreshBookings: (status?: BookingStatus) => Promise<void>;
  createBooking: (paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Cash') => Promise<Booking>;
  cancelBooking: (bookingId: string) => Promise<boolean>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedService, setSelectedService] = useState<Service | null>(MOCK_SERVICES[0]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [selectedSubServices, setSelectedSubServices] = useState<SubService[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(MOCK_ADDRESSES[0]);
  const [selectedDate, setSelectedDate] = useState<string>('20 Sep 2026');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM – 12:00 PM');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);

  const loadDefaultAddress = async () => {
    const list = await addressApi.getAddresses();
    if (list.length > 0) {
      const def = list.find((a) => a.isDefault) || list[0];
      setSelectedAddress(def);
    }
  };

  const refreshBookings = async (status?: BookingStatus) => {
    try {
      setIsLoadingBookings(true);
      const data = await bookingApi.getBookings(status);
      setBookings(data);
    } catch (e) {
      console.warn('Failed to load bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    refreshBookings();
    loadDefaultAddress();
  }, []);

  const calculatePricing = (): PricingBreakdown => {
    let basePrice = selectedPackage?.price || selectedService?.startingPrice || 999;
    if (selectedSubServices.length > 0) {
      const subTotal = selectedSubServices.reduce((acc, curr) => acc + (curr.basePrice || 0) * (curr.quantity || 1), 0);
      const addonsTotal = selectedAddons.reduce((acc, curr) => acc + (curr.price || 0) * (curr.quantity || 1), 0);
      basePrice = subTotal + addonsTotal;
    }
    const platformFee = 30;
    let discount = 0;

    if (appliedCoupon) {
      if (appliedCoupon.calculatedDiscount) {
        discount = appliedCoupon.calculatedDiscount;
      } else if (appliedCoupon.discountPercent) {
        discount = Math.round((basePrice * appliedCoupon.discountPercent) / 100);
      } else if (appliedCoupon.discountAmount) {
        discount = appliedCoupon.discountAmount;
      }
    }

    const discountedSubtotal = Math.max(0, basePrice - discount);
    const taxes = Math.round(discountedSubtotal * 0.18); // 18% GST standard in India
    const total = discountedSubtotal + platformFee + taxes;

    return {
      subtotal: basePrice,
      platformFee,
      taxes,
      discount,
      total,
    };
  };

  const pricing = calculatePricing();

  const setService = (service: Service) => {
    setSelectedService(service);
    setSelectedPackage(null); // reset package if switching service
    setSelectedSubServices([]);
    setSelectedAddons([]);
  };

  const setPackage = (pkg: ServicePackage | null) => {
    setSelectedPackage(pkg);
  };

  const setSubServices = (subServices: SubService[]) => {
    setSelectedSubServices(subServices);
  };

  const setAddons = (addons: Addon[]) => {
    setSelectedAddons(addons);
  };

  const setAddress = (address: Address) => {
    setSelectedAddress(address);
  };

  const setDateTime = (date: string, timeSlot: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
  };

  const applyCoupon = (coupon: Coupon): boolean => {
    const basePrice = pricing.subtotal;
    if (basePrice < coupon.minOrderValue) {
      return false;
    }
    setAppliedCoupon(coupon);
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const clearBookingDraft = () => {
    setSelectedPackage(null);
    setSelectedSubServices([]);
    setSelectedAddons([]);
    setAppliedCoupon(null);
  };

  const createBooking = async (paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Cash'): Promise<Booking> => {
    if (!selectedService || !selectedAddress) {
      throw new Error('Please select a service and an address.');
    }

    // Map UI payment method to backend expected enum ('ONLINE' | 'CASH' | 'WALLET')
    let backendPaymentMethod: 'ONLINE' | 'CASH' | 'WALLET' = 'ONLINE';
    if (paymentMethod === 'Cash') {
      backendPaymentMethod = 'CASH';
    } else if (paymentMethod === 'Wallet') {
      backendPaymentMethod = 'WALLET';
    }

    // Convert date + slot to ISO 8601 scheduledAt
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(10, 0, 0, 0);

    const newBooking = await bookingApi.createBooking({
      serviceId: selectedService.serviceId || selectedService.id,
      serviceName: selectedService.name,
      serviceImage: selectedService.imageUrl,
      subServices: selectedSubServices.length > 0
        ? selectedSubServices.map((s) => ({ subServiceId: s.subServiceId, quantity: s.quantity || 1 }))
        : [
            {
              subServiceId: selectedPackage?.id || selectedService.subServices?.[0]?.subServiceId || 'c34b4032-95ed-4ed5-b5e9-a7f5ab8cd4f7',
              quantity: 1,
            },
          ],
      addons: selectedAddons.map((a) => ({ addonId: a.addonId, quantity: a.quantity || 1 })),
      couponCode: appliedCoupon?.code,
      scheduledAt: scheduledDate.toISOString(),
      userLat: selectedAddress.coordinates?.latitude || 17.448293,
      userLng: selectedAddress.coordinates?.longitude || 78.374182,
      paymentMethod: backendPaymentMethod,
      package: selectedPackage || undefined,
      address: selectedAddress,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      status: 'SEARCHING_WORKER',
      pinCode: '4821', // 4-digit PIN
      payment: {
        method: paymentMethod,
        status: 'success',
        transactionId: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
        paidAt: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        subtotal: pricing.subtotal,
        platformFee: pricing.platformFee,
        taxes: pricing.taxes,
        discount: pricing.discount,
        total: pricing.total,
      },
      professional: {
        id: 'pro-raj-kumar',
        name: 'Raj Kumar',
        role: 'Home Cleaning Professional',
        rating: 4.9,
        reviewsCount: 320,
        phone: '+91 98765 12345',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        badge: 'Top Rated Pro',
        completedJobsCount: 480,
      },
    });

    await refreshBookings();
    return newBooking;
  };

  const cancelBooking = async (bookingId: string) => {
    const success = await bookingApi.cancelBooking(bookingId);
    if (success) {
      await refreshBookings();
    }
    return success;
  };

  return (
    <BookingContext.Provider
      value={{
        selectedService,
        selectedPackage,
        selectedSubServices,
        selectedAddons,
        selectedAddress,
        selectedDate,
        selectedTimeSlot,
        appliedCoupon,
        pricing,
        bookings,
        isLoadingBookings,
        setService,
        setPackage,
        setSubServices,
        setAddons,
        setAddress,
        setDateTime,
        applyCoupon,
        removeCoupon,
        clearBookingDraft,
        refreshBookings,
        createBooking,
        cancelBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
