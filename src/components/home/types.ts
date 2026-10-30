export const HomeColors = {
  primaryBlue: '#1479F8',
  darkNavy: '#101828',
  secondaryGray: '#667085',
  lightGray: '#9CA3AF',
  lightBackground: '#F7F8FA',
  cardBorder: '#F0F2F5',
  white: '#FFFFFF',
  activeBlue: '#1479F8',
  inactiveDot: '#D1D5DB',
  notificationRed: '#FF3B30',
  translucentWhite: 'rgba(255, 255, 255, 0.2)',
  borderTranslucent: 'rgba(255, 255, 255, 0.3)',
};

export interface CategoryItem {
  key?: string;
  id: string;
  name: string;
  image: any;
}

export interface PopularServiceItem {
  key?: string;
  id: string; // Category ID for navigation
  subServiceId?: string;
  name: string;
  price?: number;
  image: any;
}

export const CATEGORIES_DATA: CategoryItem[] = [];

export const POPULAR_SERVICES_DATA: PopularServiceItem[] = [];


