/**
 * Central dejkonfiguration.
 *
 * ALLE faglige standardværdier og grænser bor her. Ingen magiske tal i
 * domænelogik eller UI. Ændrer man en værdi her, ændrer man den ét sted.
 *
 * Baggrund og antagelser for fermenteringstallene: se docs/FERMENTERING.md
 */

import type { YeastType } from '../types';

/** Standardopskrift: napolitansk-inspireret hjemmedej. */
export const DEFAULT_HYDRATION = 0.62;
export const DEFAULT_SALT = 0.03;
export const DEFAULT_BALL_WEIGHT_G = 270;
export const DEFAULT_ROOM_TEMP_C = 22;
export const DEFAULT_YEAST_TYPE: YeastType = 'IDY';
export const DEFAULT_PIZZA_COUNT = 6;

/** Grænser for brugerinput (hårde fejl uden for intervallet). */
export const LIMITS = {
  pizzaCount: { min: 1, max: 30 },
  ballWeightG: { min: 150, max: 400 },
  hydration: { min: 0.5, max: 0.8 },
  salt: { min: 0.015, max: 0.04 },
  /** Rumtemperatur vi overhovedet vil regne på. */
  roomTempC: { min: 5, max: 40 },
} as const;

/**
 * Interval hvor fermenteringsmodellen er rimeligt underbygget.
 * Uden for dette interval regner vi stadig, men advarer brugeren og
 * klamper temperaturen i modellen (se docs/FERMENTERING.md).
 */
export const MODEL_TEMP_RANGE_C = { min: 12, max: 32 } as const;

/** Trinstørrelser i UI'et. */
export const STEP = {
  pizzaCount: 1,
  ballWeightG: 10,
  roomTempC: 1,
  hydrationPercent: 1,
  saltPercent: 0.1,
} as const;

/**
 * Tidsforbrug i selve arbejdsgangen (ikke fermentering).
 * Værdierne er praktiske skøn for en hjemmekøkkenproces.
 */
export const PROCESS = {
  /** Fra "nu står jeg i køkkenet" til dejen er færdigæltet. */
  mixHours: 0.5,
  /** Fra dejbollerne er formet til de står i køleskabet. */
  chillLagHours: 0.25,
  /** Mindste luft mellem "nu" og planens start. */
  leadTimeHours: 0.25,
} as const;

/**
 * Rammer for fermenteringsstrategierne. Se docs/FERMENTERING.md for
 * begrundelserne.
 */
export const FERMENTATION = {
  /** Under dette er en pizzadej ikke realistisk. */
  minTotalHours: 2.5,
  /** Vi planlægger aldrig længere end dette, selvom brugeren har mere tid. */
  preferredMaxTotalHours: 48,
  /** Fra denne samlede varighed bruger vi køleskab. */
  coldMinTotalHours: 20,
  /** Et køleskabsophold skal være mindst så langt for at give mening. */
  minFridgeHours: 8,
  /** Bulkhævning ved stuetemperatur før dejbollerne ryger på køl. */
  coldBulkHours: 2,
  /** Andel af den rumtempererede hævetid der ligger i bulk (resten som dejbolde). */
  roomBulkShare: 0.35,
  roomBulkMinHours: 0.5,
  roomBulkMaxHours: 4,
  /** Antaget køleskabstemperatur. Kan senere gøres til brugerinput. */
  fridgeTempC: 5,
  /** Timer hvor dejen stadig er ved at køle ned i køleskabet. */
  fridgeCooldownHours: 2,
  /** Relativ fermenteringshastighed (20 °C = 1,0) mens dejen køler ned. */
  fridgeCooldownRate: 0.35,
  /** Relativ fermenteringshastighed ved gennemkølet dej. */
  fridgeRate: 0.12,
  /** Udtagning fra køl: timer ved 20 °C. Skaleres med rumtemperatur. */
  temperBaseHours: 4,
  temperMinHours: 2,
  temperMaxHours: 8,
} as const;

/** Klassificering af planen ud fra samlet varighed. */
export const CLASSIFICATION_HOURS = {
  optimal: 24,
  good: 10,
  quick: 4,
} as const;

/** Under denne mængde gær anbefaler vi en præcisionsvægt. */
export const PRECISION_SCALE_YEAST_G = 0.5;

/** Sikkerhedsgrænser for selve gærmængden (bagerprocent). */
export const YEAST_PERCENT_LIMITS = { min: 0.0002, max: 0.01 } as const;

/**
 * Ankerpunkter for gærmængde: ækvivalente timer ved 20 °C -> bagerprocent IDY.
 * Der interpoleres logaritmisk mellem punkterne. Se docs/FERMENTERING.md.
 */
export const YEAST_ANCHORS_IDY: ReadonlyArray<{ hours: number; percent: number }> = [
  { hours: 2, percent: 0.008 },
  { hours: 4, percent: 0.0045 },
  { hours: 6, percent: 0.0032 },
  { hours: 8, percent: 0.0025 },
  { hours: 12, percent: 0.0017 },
  { hours: 18, percent: 0.0011 },
  { hours: 24, percent: 0.00085 },
  { hours: 36, percent: 0.00055 },
  { hours: 48, percent: 0.0004 },
  { hours: 72, percent: 0.00028 },
];

/**
 * Omregningsfaktorer mellem gærtyper, relativt til IDY.
 * KUN IDY er understøttet i MVP'en, men tabellen findes for at gøre det
 * eksplicit, at instant tørgær og aktiv tørgær ikke er det samme produkt.
 */
export const YEAST_FACTORS: Record<YeastType, number> = {
  IDY: 1,
};

/** Navne til visning. */
export const YEAST_LABELS: Record<YeastType, string> = {
  IDY: 'Instant tørgær',
};
