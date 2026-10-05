/**
 * HomeEase Design System — Color tokens, typography, spacing, shadows
 * Single source of truth for all visual design decisions.
 */

export const Colors = {
  // Brand
  primary: '#6C63FF',
  primaryDark: '#4B44CC',
  primaryLight: '#9D97FF',
  primaryFade: 'rgba(108,99,255,0.12)',

  // Accent
  accent: '#FF6584',
  accentLight: 'rgba(255,101,132,0.15)',

  // Semantic
  success: '#22C55E',
  successLight: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245,158,11,0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239,68,68,0.15)',
  info: '#38BDF8',

  // Neutrals
  background: '#0F0E17',
  surface: '#1A1929',
  surfaceLight: '#252438',
  card: '#1E1D2E',
  cardHover: '#2A2940',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(108,99,255,0.5)',
  divider: 'rgba(255,255,255,0.06)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0BB',
  textMuted: '#6B6B88',
  textDisabled: '#3E3E55',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Overlay
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
  glassBg: 'rgba(30,29,46,0.85)',
  glassBorder: 'rgba(255,255,255,0.1)',

  // Status chips
  searching: '#F59E0B',
  accepted: '#38BDF8',
  inProgress: '#6C63FF',
  completed: '#22C55E',
  cancelled: '#EF4444',

  // Gradients (used as string arrays)
  gradientPrimary: ['#6C63FF', '#4B44CC'] as const,
  gradientAccent: ['#FF6584', '#FF8C60'] as const,
  gradientSuccess: ['#22C55E', '#16A34A'] as const,
  gradientCard: ['#1E1D2E', '#252438'] as const,
  gradientBg: ['#0F0E17', '#1A1929'] as const,
};

export const Typography = {
  // Font family
  fontFamily: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
    extraBold: 'Outfit_800ExtraBold',
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 38,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

export const Layout = {
  screenPadding: Spacing.base,
  cardPadding: Spacing.base,
  headerHeight: 60,
  tabBarHeight: 70,
  inputHeight: 52,
  buttonHeight: 52,
};
