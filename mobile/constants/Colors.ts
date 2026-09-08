/**
 * TrọCare Design System — Blue-led Neutral.
 * Brand blue is reserved for navigation and primary actions. Content remains
 * navy/slate; green, amber and red only communicate real financial states.
 */

const Colors = {
  // ─── Brand Primary (Premium White & Blue) ───
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryAlpha20: 'rgba(37, 99, 235, 0.12)',
  primaryAlpha50: 'rgba(37, 99, 235, 0.4)',

  // Legacy aliases kept so older screens inherit the normalized system.
  appleBlue: '#2563EB',
  appleBlueHover: '#1D4ED8',
  appleRed: '#DC2626',
  appleGreen: '#059669',

  // ─── Semantic Operations ───
  success: '#059669',
  successDark: '#047857',
  successLight: '#ECFDF5',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',

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
    vacant: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    occupied: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    maintenance: { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' },
    reserved: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    expiringSoon: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    expired: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    disabled: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Invoice statuses
    paid: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    partial: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    sent: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    overdue: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    draft: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Contract statuses
    active: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    ended: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },

    // Deposit statuses
    holding: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    transferred: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    refunded: { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' },
    cancelled: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },
  },
} as const;

export default Colors;
