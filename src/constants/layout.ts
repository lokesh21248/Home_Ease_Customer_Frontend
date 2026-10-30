/**
 * Centralized Layout & Safe-Area Constants for HomeEase.
 * Ensures pixel-perfect alignment across iOS & Android devices.
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SpacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const LayoutConstants = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  HORIZONTAL_PADDING: 16,
  CARD_GAP: 12,
  TAB_BAR_BASE_HEIGHT: 58,
  TAB_BAR_TOP_PADDING: 10,
  HEADER_BORDER_RADIUS: 28,
  BRAND_BLUE: '#1479F8',
} as const;

/**
 * Returns the exact total height occupied by the custom bottom navigation bar
 * taking into account device-specific bottom safe area (iOS home indicator / Android gesture or 3-button).
 */
export function getTabBarTotalHeight(bottomInset: number = 0): number {
  // On iOS, bottomInset is typically ~34pt for notched devices and 0pt for older devices.
  // On Android with gesture nav, bottomInset is ~16-24pt.
  // On Android with 3-button nav, bottomInset is 0pt — we provide a comfortable 8pt padding.
  const bottomPadding = Math.max(bottomInset, Platform.OS === 'android' ? 8 : 4);
  return LayoutConstants.TAB_BAR_BASE_HEIGHT + LayoutConstants.TAB_BAR_TOP_PADDING + bottomPadding;
}

/**
 * Returns safe bottom padding for ScrollViews/FlatLists rendered inside tab screens,
 * ensuring content can always be scrolled completely above the bottom tab bar.
 */
export function getScrollBottomPadding(bottomInset: number = 0, extra: number = 20): number {
  return getTabBarTotalHeight(bottomInset) + extra;
}

/**
 * Returns consistent top padding for blue hero headers,
 * preventing double safe-area padding or content sliding behind status bar.
 */
export function getHeaderTopPadding(topInset: number = 0, extra: number = 10): number {
  const safeTop = topInset > 0 ? topInset : (Platform.OS === 'android' ? 24 : 20);
  return safeTop + extra;
}

/**
 * Returns safe bottom offset for floating action buttons (FABs).
 */
export function getFabBottomOffset(bottomInset: number = 0, isTabScreen: boolean = true): number {
  if (isTabScreen) {
    return getTabBarTotalHeight(bottomInset) + 16;
  }
  return Math.max(bottomInset, 16) + 16;
}
