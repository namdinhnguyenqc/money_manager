/**
 * TrọCare Design System — Typography Tokens
 * Mirrors the web-admin Inter font system for brand consistency.
 */

const Typography = {
  // ─── Font Families ───
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },

  // ─── Font Sizes (matching web-admin) ───
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,     // Section headers (H3)
    xl: 20,
    '2xl': 24,  // Feature headers (H2)
    '3xl': 30,  // Main title (H1)
  },

  // ─── Line Heights ───
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // ─── Letter Spacing ───
  letterSpacing: {
    tight: -0.5,
    normal: -0.2,
    wide: 0.5,
  },

  // ─── Pre-composed Styles ───
  h1: {
    fontSize: 30,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  h3: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
} as const;

export default Typography;
