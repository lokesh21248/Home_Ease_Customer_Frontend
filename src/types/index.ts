export interface User {
  id: string;
  userId?: string;
  name: string;
  fullName?: string;
  phone: string;
  phoneNumber?: string;
  email?: string;
  role?: 'CUSTOMER' | 'WORKER' | 'ADMIN';
  avatarUrl?: string;
  defaultAddressId?: string;
  referralCode?: string;
  walletBalance: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  iconType?: 'Ionicons' | 'MaterialCommunityIcons' | 'Feather' | 'FontAwesome5';
  subcategories: string[];
  bannerUrl?: string;
  accentColor?: string;
}

export interface Addon {
  addonId: string;
  subServiceId?: string;
  name: string;
  price: number;
  isActive?: boolean;
  quantity?: number;
}

export interface SubService {
  subServiceId: string;
  serviceId: string;
  name: string;
  pricingType?: 'FIXED' | 'HOURLY';
  basePrice: number;
  unitLabel?: string;
  estimatedMins?: number;
  imageUrl?: string;
  isActive?: boolean;
  addons?: Addon[];
  quantity?: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  isPopular?: boolean;
}

export interface ServiceReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Service {
  id: string;
  serviceId?: string;
  categoryId: string;
  categoryName: string;
  name: string;
  tagline?: string;
  startingPrice: number;
  duration: string;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  discountBadge?: string;
  description: string;
  isActive?: boolean;
  subServices?: SubService[];
  included: string[];
  excluded: string[];
  packages?: ServicePackage[];
  reviews?: ServiceReview[];
  faqs?: { question: string; answer: string }[];
  isSaved?: boolean;
}

export interface Address {
  id: string;
  title?: string;
  addressLine?: string;
  type: 'Home' | 'Work' | 'Other';
  label?: string;
  houseFlat: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
  lat?: number;
  lng?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export type BookingStatus =
  | 'SEARCHING_WORKER'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface Professional {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewsCount: number;
  phone: string;
  avatarUrl: string;
  badge?: string;
  completedJobsCount: number;
}

export interface TimeSlot {
  id: string;
  period: 'Morning' | 'Afternoon' | 'Evening';
  time: string;
  isAvailable: boolean;
  available?: boolean;
  date?: string;
}

export type PaymentMethod = 'CASH' | 'ONLINE' | 'WALLET' | 'UPI' | 'Card' | 'NetBanking' | 'Cash' | 'Wallet';

export interface PaymentDetails {
  method: PaymentMethod;
  status: 'pending' | 'success' | 'failed' | 'COMPLETED' | 'PENDING';
  transactionId?: string;
  paidAt?: string;
  subtotal: number;
  platformFee: number;
  taxes: number;
  discount: number;
  total: number;
}

export interface Booking {
  id: string;
  bookingId?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  workerId?: string | null;
  workerName?: string;
  workerPhone?: string;
  serviceId: string;
  serviceName: string;
  serviceImage: string;
  status: BookingStatus;
  pinCode?: string; // 4-digit security PIN to unlock job upon worker arrival
  scheduledAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  userLat?: number;
  userLng?: number;
  baseAmount?: number;
  extraAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  paymentStatus?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'pending' | 'success' | 'failed';
  paymentMethod?: PaymentMethod;
  subServices?: { subServiceId: string; quantity: number }[];
  addons?: { addonId: string; quantity: number }[];
  package?: ServicePackage;
  address: Address;
  date: string;
  timeSlot: string;
  payment: PaymentDetails;
  professional?: Professional;
  notes?: string;
  createdAt: string;
}

export interface TrackingData {
  bookingId: string;
  professional: Professional;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  pinCode?: string;
  status: BookingStatus | 'assigned' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed';
  totalAmount?: number;
  paymentStatus?: string;
  estimatedArrivalMinutes: number;
  distanceKm: number;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  customerLocation: {
    latitude: number;
    longitude: number;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'professional' | 'payment' | 'offer' | 'system';
  targetScreen?: string;
  targetParams?: any;
}

export interface Coupon {
  id?: string;
  code: string;
  title?: string;
  description?: string;
  discountType?: 'PERCENTAGE' | 'FIXED' | 'AMOUNT';
  discountVal?: number;
  calculatedDiscount?: number;
  message?: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderValue: number;
  expiresOn?: string;
  validUntil?: string;
  isValid: boolean;
}

export interface BannerSlide {
  id: string;
  bannerId?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl: string;
  targetType?: 'SERVICE' | 'CATEGORY' | 'URL';
  targetId?: string;
  serviceId?: string;
  categoryId?: string;
  buttonText?: string;
  isActive?: boolean;
}
