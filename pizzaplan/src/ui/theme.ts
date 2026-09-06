/**
 * Designtokens.
 *
 * Varmt, enkelt og let. Store tal, god luft, høj kontrast og få farver.
 * Alt UI henter farver, afstande og typografi her – ingen løse hex-koder
 * ude i komponenterne.
 */

export const colors = {
  /** Varm råhvid baggrund. */
  background: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F3ECE2',
  /** Brændt terrakotta som eneste stærke farve. */
  accent: '#C0522B',
  accentSoft: '#F6E3D9',
  accentPressed: '#A2431F',
  text: '#241C16',
  textMuted: '#6B5C50',
  border: '#E4D9CB',
  /** Statusfarver bruges altid sammen med tekst – aldrig som eneste signal. */
  positive: '#2F6B4F',
  positiveSoft: '#E3F0E8',
  caution: '#8A5A12',
  cautionSoft: '#FBEEDA',
  onAccent: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  /** Store tal i køkkenet skal kunne læses på en armslængdes afstand. */
  amount: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
} as const;

/** Mindste trykflade. Bruges konsekvent på alle knapper. */
export const MIN_TOUCH_SIZE = 48;

export const shadow = {
  card: {
    shadowColor: '#3B2A1B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
