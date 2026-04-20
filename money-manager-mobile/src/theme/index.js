export const COLORS = {
  primary: '#004ac6',
  primaryContainer: '#2563eb',
  secondary: '#006c49',
  tertiary: '#784b00',
  error: '#ba1a1a',
  accent: '#2563eb',
  emerald: '#006c49',
  gold: '#996100',
  savanna: '#faf8ff',
  slate: '#737686',

  background: '#faf8ff',
  surface: '#faf8ff',
  surfacePage: '#f6f8ff',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceHigh: '#e2e7ff',
  surfaceHighest: '#dae2fd',
  surfaceSoft: '#f2f3ff',
  border: '#c3c6d7',
  borderStrong: '#d6dbf0',
  outline: '#737686',

  textPrimary: '#131b2e',
  textSecondary: '#434655',
  textMuted: '#737686',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',

  success: '#006c49',
  successLight: '#6cf8bb',
  warning: '#996100',
  warningLight: '#ffddb8',
  danger: '#ba1a1a',
  dangerLight: '#ffdad6',
  incomeLight: '#6cf8bb',
  expenseLight: '#ffdad6',

  income: '#006c49',
  expense: '#ba1a1a',
  rental: '#004ac6',
  trading: '#004ac6',

  primaryLight: '#dbe1ff',
  primaryMid: '#2563eb',
  primaryDark: '#003ea8',
  gradientStart: '#004ac6',
  gradientEnd: '#2563eb',
  gradientCyan: '#2563eb',
  borderSoft: '#e2e7ff',
  white20: 'rgba(255,255,255,0.2)',
  shadowBlue: 'rgba(19, 27, 46, 0.08)',
  shadowStrong: 'rgba(19, 27, 46, 0.12)',
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  black: { fontFamily: 'System', fontWeight: '800' },
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, lineHeight: 38, ...FONTS.black, color: COLORS.textPrimary },
  h2: { fontSize: 24, lineHeight: 30, ...FONTS.bold, color: COLORS.textPrimary },
  h3: { fontSize: 18, lineHeight: 24, ...FONTS.semibold, color: COLORS.textPrimary },
  body: { fontSize: 14, lineHeight: 20, ...FONTS.regular, color: COLORS.textSecondary },
  caption: { fontSize: 12, lineHeight: 16, ...FONTS.medium, color: COLORS.textMuted },
  label: { fontSize: 11, lineHeight: 14, ...FONTS.bold, color: COLORS.textMuted, letterSpacing: 0.4 },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  md: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 5,
  },
  lg: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.06,
    shadowRadius: 36,
    elevation: 10,
  },
  studio: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.08,
    shadowRadius: 48,
    elevation: 16,
  },
};

export const WEB = {
  sidebarWidth: 268,
  shellGap: 18,
  shellPaddingX: 28,
  shellPaddingY: 18,
  contentMax: {
    xl: 1240,
    lg: 1120,
    md: 960,
  },
};
