import { NavigatorScreenParams } from '@react-navigation/native';
import { Service, Booking } from '../types';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Otp: { phone: string };
  CreateAccount: { phone: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AllCategories: undefined;
  ServiceListing: { categoryId?: string; categoryName?: string; searchQuery?: string };
  ServiceDetails: { serviceId: string; service?: Service };
  AddressSelection: undefined;
  DateTimeSlot: undefined;
  BookingSummary: undefined;
  Payment: undefined;
  BookingConfirmation: { booking: Booking };
  LiveTracking: { bookingId: string };
  BookingDetails: { bookingId: string };
  MyAddresses: undefined;
  PaymentsHistory: undefined;
  SavedServices: undefined;
  OffersCoupons: undefined;
  ReferEarn: undefined;
  Notifications: undefined;
  HelpSupport: undefined;
  Settings: undefined;
};
