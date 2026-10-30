/**
 * HomeEase Design System — Pronto-style premium blue & white theme.
 */

export const Colors = {
  // Brand — HomeEase Blue
  primary: '#1479F8',
  primaryDark: '#0D62D1',
  primaryLight: '#3D92FA',
  primaryFade: 'rgba(20, 121, 248, 0.10)',
  primaryFade2: 'rgba(20, 121, 248, 0.05)',

  // Accent
  accent: '#FF6B35',
  accentLight: 'rgba(255,107,53,0.12)',
  accentYellow: '#F59E0B',
  accentGreen: '#10B981',

  // Semantic
  success: '#10B981',
  successLight: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  warningLight: 'rgba(245,158,11,0.12)',
  error: '#EF4444',
  errorLight: 'rgba(239,68,68,0.12)',
  info: '#3B82F6',

  // Neutrals — Light theme
  background: '#F3F4F8',
  surface: '#FFFFFF',
  surfaceLight: '#F8F9FC',
  surfaceDark: '#EEF0F5',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderActive: '#2563EB',
  divider: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  textBlue: '#2563EB',

  // Overlay
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(0,0,0,0.12)',
  glassBg: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(0,0,0,0.06)',

  // Status
  searching: '#F59E0B',
  accepted: '#3B82F6',
  inProgress: '#2563EB',
  completed: '#10B981',
  cancelled: '#EF4444',

  // Gradients
  gradientPrimary: ['#2563EB', '#1D4ED8'] as const,
  gradientAccent: ['#FF6B35', '#FF8C00'] as const,
  gradientSuccess: ['#10B981', '#059669'] as const,
  gradientCard: ['#FFFFFF', '#F8F9FC'] as const,
  gradientBg: ['#FFFFFF', '#F3F4F8'] as const,
  gradientHero: ['#1E40AF', '#2563EB'] as const,
};

export const Typography = {
  fontFamily: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
    extraBold: 'Outfit_800ExtraBold',
  },
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
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
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
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  blue: {
    shadowColor: '#2563EB',
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
  tabBarHeight: 68,
  inputHeight: 52,
  buttonHeight: 54,
};
