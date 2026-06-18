// ─────────────────────────────────────────────────────────────────────────────
//  VacciKids  ·  VIP Design System  ·  "Azure Healthcare Premium"
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary:       '#006FEE',   // azure‑500
  primaryLight:  '#338EF7',   // azure‑400
  primaryDark:   '#004FC4',   // azure‑700
  primaryDeep:   '#002D8A',   // azure‑900
  primaryTint:   '#EEF2FF',   // azure‑50

  // ── Accent ─────────────────────────────────────────────────────────────────
  accent:        '#F5A524',   // amber
  accentDark:    '#C88000',
  accentLight:   '#FFF3D6',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success:       '#17C964',
  successDark:   '#12A150',
  successBg:     '#E8FAF0',
  warning:       '#F5A524',
  warningBg:     '#FFF3D6',
  danger:        '#F31260',
  dangerDark:    '#C20E4D',
  dangerBg:      '#FEE7EF',
  info:          '#006FEE',
  infoBg:        '#EEF2FF',

  // ── Neutrals ───────────────────────────────────────────────────────────────
  background:    '#F8F9FE',   // near‑white with blue tint
  surface:       '#FFFFFF',
  surfaceMuted:  '#F4F5F8',
  surfaceElevated:'#FFFFFF',

  border:        '#E4E9F2',
  borderStrong:  '#C8D0E0',

  // ── Text ───────────────────────────────────────────────────────────────────
  text:          '#0D0F1C',
  textSecondary: '#5B6272',
  textLight:     '#9BA3B5',
  textInverse:   '#FFFFFF',

  // ── Child avatar gradients (one per child) ──────────────────────────────
  avatarA: ['#6366F1', '#8B5CF6'],  // indigo→violet
  avatarB: ['#EC4899', '#F43F5E'],  // pink→rose
  avatarC: ['#F59E0B', '#EF4444'],  // amber→red
  avatarD: ['#10B981', '#06B6D4'],  // emerald→cyan
  avatarE: ['#3B82F6', '#8B5CF6'],  // blue→violet

  // ── Misc ───────────────────────────────────────────────────────────────────
  white:         '#FFFFFF',
  overlay:       'rgba(0,0,0,0.45)',
  glass:         'rgba(255,255,255,0.14)',
  glassBorder:   'rgba(255,255,255,0.28)',
};

export const Gradients = {
  brand:     ['#004FC4', '#006FEE'],
  brandWide: ['#002D8A', '#004FC4', '#006FEE'],
  auth:      ['#002D8A', '#004FC4', '#338EF7'],
  card:      ['#006FEE', '#338EF7'],
  success:   ['#12A150', '#17C964'],
  danger:    ['#C20E4D', '#F31260'],
  accent:    ['#C88000', '#F5A524'],
  sunshine:  ['#004FC4', '#006FEE', '#F5A524'],
};

export const Typography = {
  hero:        { fontSize: 36, fontWeight: '800', letterSpacing: -1,   lineHeight: 42 },
  display:     { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36 },
  title:       { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 },
  subtitle:    { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  body:        { fontSize: 15, fontWeight: '400', letterSpacing: 0,    lineHeight: 22 },
  bodyStrong:  { fontSize: 15, fontWeight: '600', letterSpacing: 0,    lineHeight: 22 },
  caption:     { fontSize: 12, fontWeight: '500', letterSpacing: 0,    lineHeight: 17 },
  overline:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.2,  lineHeight: 14, textTransform: 'uppercase' },
  micro:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.5,  lineHeight: 13 },
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24,
  '2xl': 32, '3xl': 40, '4xl': 52, '5xl': 68,
};

export const Radii = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 22, '2xl': 28, '3xl': 36,
  pill: 999, header: 32, card: 20,
};

export const Elevation = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs:   { shadowColor: '#004FC4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,  elevation: 1 },
  sm:   { shadowColor: '#004FC4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,  elevation: 2 },
  md:   { shadowColor: '#004FC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  lg:   { shadowColor: '#004FC4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
  xl:   { shadowColor: '#002D8A', shadowOffset: { width: 0, height: 16}, shadowOpacity: 0.18, shadowRadius: 40, elevation: 14 },
  card: { shadowColor: '#0D0F1C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4 },
};

export const TouchTargets = { min: 44, comfortable: 50, large: 56 };
