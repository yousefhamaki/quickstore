import { Platform } from 'react-native';

// Brand palette — matches the web app's Tailwind "from-blue-600 to-purple-600"
// gradient used on primary buttons/headers across QuickStore/Buildora.
//
// Redesign ("layered glass with depth", iOS Wallet-inspired): the app no
// longer sits on a flat light-gray page background. Every screen renders on
// top of a shared, atmospheric dark gradient (see components/AppBackground)
// with the brand blue/purple bleeding through as soft glow blobs, and
// content surfaces are frosted glass (components/Card) floating above it —
// real z-depth instead of flat fills. The brand gradient stays the identity
// anchor (HeroStat, GradientButton, glows, borders) but is no longer used as
// a flat card background everywhere.
export const colors = {
  gradientStart: '#2563EB', // blue-600
  gradientEnd: '#7C3AED', // purple-600
  brandDark: '#1E1B4B', // deep indigo — also the native splash background (app.json), so the
  // handoff into the in-app atmosphere below is seamless.
  primary: '#2563EB',

  // Atmosphere — the shared dark gradient backdrop (components/AppBackground.tsx),
  // mounted once at the root so it's automatically behind every screen.
  bgTop: '#0A0E1F',
  bgMid: '#161335',
  bgBottom: '#1E1B4B',
  glowBlue: 'rgba(37, 99, 235, 0.55)',
  glowPurple: 'rgba(124, 58, 237, 0.5)',

  // Frosted glass surfaces (components/Card.tsx and anything built on it) —
  // a light, fairly opaque tint layered on top of a real blur so dark text
  // stays legible over the busy gradient/glow backdrop underneath.
  glassFill: 'rgba(255, 255, 255, 0.74)',
  glassFillStrong: 'rgba(255, 255, 255, 0.88)', // inputs / anything needing extra contrast
  glassFillSubtle: 'rgba(255, 255, 255, 0.5)', // decorative chips over already-light areas
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.85)',

  // Legacy flat-card tokens — still used *inside* glass cards for content
  // (dark text over the light glass tint reads fine) and by a couple of
  // self-contained pills (StatusBadge) that intentionally stay opaque.
  card: '#FFFFFF',
  background: '#F7F8FC',
  border: '#E7EAF3',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',

  // For text/icons that sit directly on the dark atmosphere (outside a glass
  // card) — headers, empty/loading states, filter chips' unselected label, etc.
  textInverse: '#F8FAFC',
  textInverseMuted: 'rgba(248, 250, 252, 0.72)',
  textInverseFaint: 'rgba(248, 250, 252, 0.5)',

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
  partially_refunded: { bg: '#F3E8FF', text: '#6B21A8' },
  active: { bg: '#DCFCE7', text: '#166534' },
  draft: { bg: '#F1F5F9', text: '#475569' },
  archived: { bg: '#FEE2E2', text: '#991B1B' },
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
  xl: 28,
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

// Elevation for frosted glass cards (components/Card.tsx) — a soft, fairly
// deep dark shadow so cards read as floating above the atmosphere, plus
// Android's `elevation`.
export const shadow = Platform.select({
  web: {
    boxShadow: '0px 10px 30px rgba(2, 6, 23, 0.35), 0px 1px 1px rgba(255,255,255,0.5) inset',
  },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
}) as object;

// A colored "glow" shadow reserved for brand-gradient surfaces (HeroStat,
// GradientButton) — makes them read as lit-from-within rather than flat
// fills, reinforcing depth without a hard drop shadow.
export const glowShadow = Platform.select({
  web: {
    boxShadow: '0px 14px 40px rgba(37, 99, 235, 0.45)',
  },
  default: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
}) as object;

// Shared motion timings so entrance/press animations feel consistent
// instead of every screen picking its own durations.
export const motion = {
  fast: 120,
  base: 220,
  slow: 420,
  stagger: 55, // per-item delay step for staggered list entrances
};

// The bottom tab bar (app/(tabs)/_layout.tsx) floats as a glass pill rather
// than docking flush to the screen edge, so scrollable screens need extra
// bottom clearance to avoid their last item hiding behind it.
export const layout = {
  tabBarHeight: 64,
  tabBarBottomOffset: 16,
  get tabBarClearance() {
    return this.tabBarHeight + this.tabBarBottomOffset + spacing.lg;
  },
};

// EGP formatting — this SaaS is Egypt-only, currency is always EGP.
export function formatEGP(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}
