import { Platform } from 'react-native';

// Brand palette — matches the web app's Tailwind "from-blue-600 to-purple-600"
// gradient used on primary buttons/headers across QuickStore/Buildora.
export const colors = {
  gradientStart: '#2563EB', // blue-600
  gradientEnd: '#7C3AED', // purple-600
  brandDark: '#1E1B4B', // deep indigo — splash/hero backgrounds
  primary: '#2563EB',
  background: '#F7F8FC',
  card: '#FFFFFF',
  border: '#E7EAF3',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
};

export const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  processing: { bg: '#E0E7FF', text: '#3730A3' },
  shipped: { bg: '#CFFAFE', text: '#155E75' },
  delivered: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  refunded: { bg: '#F3E8FF', text: '#6B21A8' },
};

// A real spacing scale — every screen pulls from this instead of eyeballing
// per-screen padding, so rhythm stays consistent across the app.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

// Type scale — display for hero numbers, h1/h2 for section titles, body for
// content, caption/label for meta text. Keeps every screen pulling from the
// same handful of sizes/weights instead of ad hoc fontSize values.
export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  bodyLarge: { fontSize: 16, fontWeight: '500' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyBold: { fontSize: 14, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
};

// A single elevation treatment reused by every card (components/Card.tsx) —
// a soft shadow on iOS/web plus Android's `elevation`, rather than each
// screen inventing its own shadow values.
export const shadow = Platform.select({
  web: {
    boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.04), 0px 4px 16px rgba(15, 23, 42, 0.06)',
  },
  default: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
}) as object;

// EGP formatting — this SaaS is Egypt-only, currency is always EGP.
export function formatEGP(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}
