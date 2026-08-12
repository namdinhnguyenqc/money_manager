/**
 * TrọCare Design System — Color Tokens (Ethereal Aurora White & Porcelain)
 * Breakthrough PO & UI/UX color architecture: Matte Snow White backing,
 * pure white porcelain cards with faint custom-colored shadows, Royal Amethyst brand purple,
 * and semantic Mint Teal (success) & Terracotta Coral (expenses).
 */

const Colors = {
  // ─── Brand Primary (Premium White & Blue) ───
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#F0F9FF',  // Soft sky blue backing
  primaryAlpha20: 'rgba(37, 99, 235, 0.12)',
  primaryAlpha50: 'rgba(37, 99, 235, 0.4)',

  // ─── Semantic Brand Overrides (Unique & Fresh) ───
  appleBlue: '#2563EB',
  appleBlueHover: '#1D4ED8',
  appleRed: '#F43F5E',      // Coral Crimson
  appleGreen: '#0D9488',    // Mint Teal

  // ─── Semantic Operations ───
  success: '#0D9488',       // Mint Teal (Success/Income)
  successDark: '#0f766e',
  successLight: 'rgba(13, 148, 136, 0.08)',
  danger: '#F43F5E',        // Coral Crimson (Expenses)
  dangerLight: 'rgba(244, 63, 94, 0.08)',
  warning: '#EAB308',       // Muted gold (Warning/Pending)
  warningLight: 'rgba(234, 179, 8, 0.08)',

  // ─── Ethereal Alabaster Surfaces ───
  background: '#F8FAFC',
  surface: '#FFFFFF',       // Pure white porcelain card surface
  border: '#E2E8F0',
  borderLight: '#E2E8F0',

  // ─── Typography (High Contrast Charcoal) ───
  textPrimary: '#0F172A',   // Charcoal text
  textSecondary: '#475569', // Medium slate text
  textMuted: '#64748B',
  textWhite: '#ffffff',

  // ─── Shadows (Custom ethereal glows) ───
  shadowBento: 'rgba(0, 113, 227, 0.04)',
  shadowCard: 'rgba(15, 23, 42, 0.03)',

  // ─── Status Capsule Badge Colors ───
  status: {
    // Room statuses
    vacant: { bg: 'rgba(13, 148, 136, 0.08)', text: '#0D9488', border: 'rgba(13, 148, 136, 0.2)' },
    occupied: { bg: 'rgba(0, 113, 227, 0.08)', text: '#0071e3', border: 'rgba(0, 113, 227, 0.2)' },
    maintenance: { bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
    reserved: { bg: 'rgba(234, 179, 8, 0.08)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.2)' },
    expiringSoon: { bg: 'rgba(234, 179, 8, 0.08)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.2)' },
    expired: { bg: 'rgba(244, 63, 94, 0.08)', text: '#F43F5E', border: 'rgba(244, 63, 94, 0.2)' },
    disabled: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Invoice statuses
    paid: { bg: 'rgba(13, 148, 136, 0.08)', text: '#0D9488', border: 'rgba(13, 148, 136, 0.2)' },
    partial: { bg: 'rgba(0, 113, 227, 0.08)', text: '#0071e3', border: 'rgba(0, 113, 227, 0.2)' },
    sent: { bg: 'rgba(234, 179, 8, 0.08)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.2)' },
    overdue: { bg: 'rgba(244, 63, 94, 0.08)', text: '#F43F5E', border: 'rgba(244, 63, 94, 0.2)' },
    draft: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Contract statuses
    active: { bg: 'rgba(0, 113, 227, 0.08)', text: '#0071e3', border: 'rgba(0, 113, 227, 0.2)' },
    ended: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Deposit statuses
    holding: { bg: 'rgba(0, 113, 227, 0.08)', text: '#0071e3', border: 'rgba(0, 113, 227, 0.2)' },
    transferred: { bg: 'rgba(13, 148, 136, 0.08)', text: '#0D9488', border: 'rgba(13, 148, 136, 0.2)' },
    refunded: { bg: 'rgba(234, 179, 8, 0.08)', text: '#EAB308', border: 'rgba(234, 179, 8, 0.2)' },
    cancelled: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },
  },
} as const;

export default Colors;
