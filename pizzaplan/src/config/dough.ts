/**
 * Central dejkonfiguration.
 *
 * ALLE faglige standardværdier og grænser bor her. Ingen magiske tal i
 * domænelogik eller UI. Ændrer man en værdi her, ændrer man den ét sted.
 *
 * Baggrund og antagelser for fermenteringstallene: se docs/FERMENTERING.md
 */

import type { DoughMethod, FermentationRoute, PrefermentKind, YeastType } from '../types';

/** Standardopskrift: napolitansk-inspireret hjemmedej. */
export const DEFAULT_HYDRATION = 0.62;
export const DEFAULT_SALT = 0.03;
export const DEFAULT_BALL_WEIGHT_G = 270;
export const DEFAULT_ROOM_TEMP_C = 22;
export const DEFAULT_YEAST_TYPE: YeastType = 'IDY';
export const DEFAULT_PIZZA_COUNT = 6;
/** Klassisk napolitansk er en direkte dej (impasto diretto). */
export const DEFAULT_METHOD: DoughMethod = 'direct';
/** Som udgangspunkt vælger appen selv forløbet ud fra tiden. */
export const DEFAULT_ROUTE: FermentationRoute = 'auto';

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
  /**
   * Relativ fermenteringshastighed (20 °C = 1,0) mens dejen køler ned.
   * Dejen er stadig lun det første stykke tid i køleskabet.
   */
  fridgeCooldownRate: 0.55,
  /**
   * Relativ fermenteringshastighed ved gennemkølet dej ved 5 °C.
   *
   * Svarer til fordoblingsreglen ført ned til 5 °C: cirka tre gange
   * langsommere end ved 20 °C. Den ofte gentagne påstand om, at koldhævning
   * er otte gange langsommere, passer ikke med, hvad der faktisk sker: en
   * dej med 0,2 % gær er overhævet efter tre døgn på køl.
   */
  fridgeRate: 0.35,
  /** Udtagning fra køl: timer ved 20 °C. Skaleres med rumtemperatur. */
  temperBaseHours: 4,
  temperMinHours: 2,
  temperMaxHours: 8,
} as const;

/**
 * Fordeje (indirekte metoder).
 *
 * flourShare er andelen af den SAMLEDE melmængde, der ligger i fordejen.
 * hydration er fordejens egen hydrering: poolish er flydende (lige dele mel
 * og vand), biga er en tør, klumpet fordej.
 *
 * baseHours er modningstiden ved 20 °C. Den skaleres med rumtemperaturen på
 * samme måde som resten af modellen. Se docs/FERMENTERING.md.
 */
export const PREFERMENTS: Record<
  PrefermentKind,
  {
    flourShare: number;
    hydration: number;
    baseHours: number;
    minHours: number;
    maxHours: number;
    yeastFactor: number;
  }
> = {
  poolish: {
    flourShare: 0.3,
    hydration: 1.0,
    baseHours: 12,
    minHours: 6,
    maxHours: 18,
    yeastFactor: 1,
  },
  biga: {
    flourShare: 0.4,
    hydration: 0.45,
    baseHours: 14,
    minHours: 10,
    maxHours: 24,
    // En tør fordej hæver mærkbart langsommere end en våd ved samme
    // temperatur, fordi der er mindre vand til rådighed for gæren. Uden
    // denne korrektion ville bigaen ikke være moden, når planen siger.
    yeastFactor: 2,
  },
};

/**
 * En moden fordej på 30-40 % af melet indeholder allerede en stor, aktiv
 * gærbestand og står for hovedparten af hævekraften. Derfor nedsættes gæren
 * i den endelige dej til denne andel af det, en direkte dej ville kræve.
 */
export const PREFERMENT_LEAVENING_CREDIT = 0.3;

/**
 * Den endelige dej må ikke blive knastør, når fordejen har taget en stor del
 * af vandet. Er der ikke vand nok, skrues fordejens andel ned.
 */
export const MIN_FINAL_DOUGH_HYDRATION = 0.4;

/** Mindste samlede tid, en metode overhovedet kan nå at blive til noget på. */
export const METHOD_MIN_TOTAL_HOURS: Record<DoughMethod, number> = {
  direct: 2.5,
  poolish: 16,
  biga: 22,
};

/**
 * Et rent stuetemperaturforløb planlægges aldrig længere end dette.
 * 24 timer svarer til den klassiske napolitanske dej, der laves dagen før.
 */
export const ROOM_MAX_TOTAL_HOURS = 24;

/** Navne og korte forklaringer til metodevalget. */
export const METHOD_LABELS: Record<DoughMethod, string> = {
  direct: 'Direkte dej',
  poolish: 'Poolish',
  biga: 'Biga',
};

export const METHOD_DESCRIPTIONS: Record<DoughMethod, string> = {
  direct: 'Alt røres sammen på én gang. Den klassiske napolitanske.',
  poolish: 'Våd fordej først, derefter dejen. Giver mild, let sødlig smag.',
  biga: 'Tør fordej først. Giver kraftigere smag og mere tyggemodstand.',
};

/** Det italienske navn, som brugeren kan møde i opskrifter. */
export const METHOD_ITALIAN: Record<DoughMethod, string> = {
  direct: 'impasto diretto',
  poolish: 'impasto indiretto con poolish',
  biga: 'impasto indiretto con biga',
};

export const ROUTE_LABELS: Record<FermentationRoute, string> = {
  auto: 'Lad PizzaPlan vælge',
  room: 'Stuetemperatur',
  cold: 'Køleskab',
};

export const ROUTE_DESCRIPTIONS: Record<FermentationRoute, string> = {
  auto: 'Vi vælger ud fra, hvor lang tid du har.',
  room: 'Hele hævningen står fremme. Klassisk, op til 24 timer.',
  cold: 'Dejbollerne hæver mest på køl. Kræver mindst et døgn.',
};

/** Klassificering af planen ud fra samlet varighed. */
export const CLASSIFICATION_HOURS = {
  optimal: 24,
  good: 10,
  quick: 4,
} as const;

/** Under denne mængde gær anbefaler vi en præcisionsvægt. */
export const PRECISION_SCALE_YEAST_G = 0.5;

/** Sikkerhedsgrænser for selve gærmængden (bagerprocent). */
export const YEAST_PERCENT_LIMITS = { min: 0.00005, max: 0.01 } as const;

/**
 * Loft over gærmængden i lange planer.
 *
 * En direkte dej, der hæver i et døgn eller mere, må aldrig få mere end
 * 0,4 g instant tørgær pr. kg mel. Det er en fast fagligregel fra praksis og
 * ligger som et selvstændigt loft oven på modellen, så en fejlkalibrering et
 * andet sted i kæden ikke kan give en overgæret dej.
 *
 * Ved indirekte metoder gælder loftet gæren i den ENDELIGE dej. Fordejen har
 * sin egen, kortere modning og sin egen gærberegning.
 */
export const LONG_PLAN_HOURS = 24;
export const MAX_YEAST_PERCENT_LONG_PLAN = 0.0004;

/**
 * Ankerpunkter for gærmængde: ækvivalente timer ved 20 °C -> bagerprocent IDY.
 * Der interpoleres logaritmisk mellem punkterne. Se docs/FERMENTERING.md.
 *
 * Kurven er STEJLERE end omvendt proportional: dobbelt så lang tid kræver
 * mindre end den halve gærmængde. Gæren formerer sig undervejs, så en lang
 * hævning skal startes med langt mindre, end en simpel halvering antyder.
 *
 * Ankeret for et døgn er den klassiske napolitanske dej: cirka 0,3 g instant
 * tørgær pr. kg mel ved 20 °C, svarende til omkring 1 g frisk gær.
 */
export const YEAST_ANCHORS_IDY: ReadonlyArray<{ hours: number; percent: number }> = [
  { hours: 2, percent: 0.008 },
  { hours: 4, percent: 0.004 },
  { hours: 6, percent: 0.0025 },
  { hours: 8, percent: 0.0018 },
  { hours: 12, percent: 0.001 },
  { hours: 18, percent: 0.0005 },
  { hours: 24, percent: 0.00032 },
  { hours: 36, percent: 0.0002 },
  { hours: 48, percent: 0.00014 },
  { hours: 72, percent: 0.00009 },
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
