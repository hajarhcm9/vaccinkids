// ============================================================
// VacciTrack Design System — Palette vert/jaune pédiatrique
// ============================================================

export const Colors = {
  // --- Brand : vert santé + jaune chaleur ---
  primary: '#2D9B6E',
  primaryDark: '#1B6E4D',
  primaryLight: '#7CCBA5',
  primaryTint: '#E6F4EE',

  accent: '#F5C518',
  accentDark: '#C99A00',
  accentLight: '#FFE89C',

  // --- Sémantiques ---
  success: '#16A34A',
  warning: '#F5C518',
  danger:  '#DC2626',
  info:    '#3B82F6',

  // --- Surfaces & textes ---
  background:     '#F7FAF6',
  surface:        '#FFFFFF',
  surfaceMuted:   '#F0F4EE',
  border:         '#D9E3DC',
  borderStrong:   '#B7C7BC',

  text:            '#1A2B20',
  textSecondary:   '#5C6F62',
  textLight:       '#9DAFA3',
  textInverse:     '#FFFFFF',

  white:  '#FFFFFF',
  secondary: '#2D9B6E',
};

export const Gradients = {
  brand:        ['#1B6E4D', '#2D9B6E'],
  auth:         ['#1B6E4D', '#2D9B6E', '#7CCBA5'],
  sunshine:     ['#2D9B6E', '#4FB286', '#F5C518'],
};

export const Typography = {
  display:      { fontSize: 32, fontWeight: 'bold',   color: Colors.text,            lineHeight: 38 },
  title:        { fontSize: 24, fontWeight: 'bold',   color: Colors.text,            lineHeight: 30 },
  subtitle:     { fontSize: 18, fontWeight: '600',    color: Colors.text,            lineHeight: 24 },
  body:         { fontSize: 16, fontWeight: '400',    color: Colors.textSecondary,   lineHeight: 22 },
  bodyStrong:   { fontSize: 16, fontWeight: '600',    color: Colors.text,            lineHeight: 22 },
  caption:      { fontSize: 13, fontWeight: '400',    color: Colors.textSecondary,   lineHeight: 18 },
  overline:     { fontSize: 11, fontWeight: '700',    color: Colors.textSecondary,   lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24,
  '2xl': 32, '3xl': 40, '4xl': 48, '5xl': 64,
};

export const Radii = {
  sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, pill: 999, header: 30,
};

export const Elevation = {
  none:  { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm:    { shadowColor: '#1A2B20', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,  elevation: 2 },
  md:    { shadowColor: '#1A2B20', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 5 },
  lg:    { shadowColor: '#1A2B20', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 8 },
  xl:    { shadowColor: '#1A2B20', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 12 },
};

export const TouchTargets = {
  min: 44, comfortable: 48, large: 56,
};