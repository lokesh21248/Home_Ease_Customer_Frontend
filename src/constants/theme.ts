export const COLORS = {
  // Primary background gradient tones (from Image 2: warm luminous honey to sage teal)
  bgGradientStart: '#FBF5E6', // Warm honey cream
  bgGradientMid: '#E8F1EA',   // Soft transition mint
  bgGradientEnd: '#D2E5DC',   // Calming sage teal

  // Solid fallback backgrounds
  background: '#F7F4EC',
  backgroundLight: '#FDFBF7',
  backgroundCard: 'rgba(255, 255, 255, 0.78)',
  backgroundCardSolid: '#FFFFFF',
  backgroundCardMuted: 'rgba(235, 245, 240, 0.65)',

  // Deep Forest / Slate Brand Colors (Primary text & prominent headers)
  primaryDark: '#132B23',     // Deepest forest slate
  primary: '#1B4035',         // Rich forest green brand
  primaryLight: '#2C5A4C',    // Lighter forest
  forestMuted: '#3D6C5D',

  // Radiant Honey / Marigold Yellow Accent (Active icons, badges, price tags, highlight CTAs)
  accent: '#F8BD38',          // Glowing honey yellow
  accentHover: '#EAA922',
  accentLight: '#FEF4D9',
  accentPale: '#FFF9EB',

  // Secondary & Text Colors
  textPrimary: '#122922',
  textSecondary: '#4A6D61',
  textMuted: '#77998D',
  textLight: '#9FBAB0',
  textWhite: '#FFFFFF',

  // Status & Semantic Colors
  success: '#268759',
  successLight: '#E6F6EE',
  warning: '#E68A00',
  warningLight: '#FFF4E5',
  error: '#D94338',
  errorLight: '#FDECEB',
  info: '#2D72D9',
  infoLight: '#EBF3FE',

  // Borders & Dividers
  border: 'rgba(50, 100, 80, 0.22)',
  borderGlass: 'rgba(255, 255, 255, 0.85)',
  borderLight: 'rgba(50, 100, 80, 0.12)',
  borderMedium: 'rgba(50, 100, 80, 0.22)',
  divider: 'rgba(40, 90, 70, 0.08)',

  // Frosted Glass Tones
  glassBackground: 'rgba(255, 255, 255, 0.72)',
  glassDarkBackground: 'rgba(18, 42, 34, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  glassBorderDark: 'rgba(255, 255, 255, 0.15)',

  // Bottom Navigation Dock
  dockBackground: 'rgba(19, 43, 35, 0.92)',
  dockActivePill: '#F8BD38',
  dockActiveIcon: '#122922',
  dockInactiveIcon: '#9BB8AD',

  // Shadows
  shadowColor: '#102E24',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 9999,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const SHADOWS = {
  subtle: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  glass: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
