/**
 * Centrale datamodeller for PizzaPlan.
 *
 * Domænelaget kender intet til React. Alle typer her er rene data.
 */

/**
 * Gærtype. MVP understøtter kun instant tørgær (IDY).
 * Aktiv tørgær og frisk gær er bevidst IKKE med, fordi de kræver
 * separate omregningsregler.
 */
export type YeastType = 'IDY';

/**
 * Dejmetode.
 *
 * Den egentlige hovedopdeling er DIREKTE (impasto diretto: mel, vand, salt og
 * gær bliver til den endelige dej med det samme) og INDIREKTE, hvor en fordej
 * laves først. Poolish er en våd fordej, biga en tør.
 *
 * "24 timer" og "48 timer" er derimod ikke metoder – det er fermenteringsforløb.
 * De hører til under FermentationRoute.
 */
export type DoughMethod = 'direct' | 'poolish' | 'biga';

/** De metoder, der bruger en fordej. */
export type PrefermentKind = Exclude<DoughMethod, 'direct'>;

/**
 * Fermenteringsforløb: hvor dejen står, ikke hvordan den er sat.
 *
 * 'auto' lader PizzaPlan vælge ud fra den tilgængelige tid.
 */
export type FermentationRoute = 'auto' | 'room' | 'cold';

/** Brugerens input til en dejplan. */
export interface DoughInput {
  /** Antal pizzaer. */
  pizzaCount: number;
  /** Vægt pr. dejbold i gram. */
  ballWeightG: number;
  /** Hydrering som decimal, fx 0,62. */
  hydration: number;
  /** Salt som decimal af melvægten, fx 0,03. */
  salt: number;
  /** Gærtype. */
  yeastType: YeastType;
  /** Cirka rumtemperatur i °C. */
  roomTempC: number;
  /** Direkte dej eller fordej. */
  method: DoughMethod;
  /** Stuetemperatur, køleskab eller lad appen vælge. */
  route: FermentationRoute;
  /** Hvornår pizzaerne skal spises (lokal tid). */
  servingTime: Date;
}

/** Mængderne i en fordej (poolish eller biga). */
export interface PrefermentAmounts {
  kind: PrefermentKind;
  flourG: number;
  waterG: number;
  yeastG: number;
  /** Fordejens egen hydrering, fx 1,0 for poolish. */
  hydration: number;
  /** Andel af den samlede melmængde, der ligger i fordejen. */
  flourShare: number;
  /** Modningstid i timer. */
  hours: number;
}

/** Det, der tilsættes når den endelige dej æltes. */
export interface FinalDoughAmounts {
  flourG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
}

/**
 * Ingredienser beregnet med fuld præcision. Afrunding sker først i visningen.
 * Tallene på øverste niveau er de SAMLEDE mængder – dem man køber ind og vejer af.
 */
export interface Ingredients {
  totalDoughG: number;
  flourG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
  /** Samlet gær som bagerprocent af den samlede melvægt. */
  yeastPercent: number;
  yeastType: YeastType;
  /** Findes kun ved indirekte metoder. */
  preferment?: PrefermentAmounts;
  /** Hvad der skal i skålen ved æltning af den endelige dej. */
  finalDough: FinalDoughAmounts;
}

/**
 * Fermenteringsstrategi valgt af motoren: metode og forløb sat sammen.
 * Metoden siger hvordan dejen er sat, forløbet hvor den hæver.
 */
export type FermentationStrategyId =
  | 'direct-room'
  | 'direct-cold'
  | 'poolish-room'
  | 'poolish-cold'
  | 'biga-room'
  | 'biga-cold';

/** En fase i fermenteringen med en antaget temperatur. */
export type FermentationPhaseKind =
  /** Fordejens modning (poolish eller biga). */
  | 'preferment'
  /** Puntata: dejen hæver samlet efter æltning. */
  | 'bulk-room'
  /** Appretto: dejbollerne hæver færdig ved stuetemperatur. */
  | 'balls-room'
  | 'fridge-cooldown'
  | 'fridge'
  | 'temper';

export interface FermentationPhase {
  kind: FermentationPhaseKind;
  hours: number;
  /** Antaget temperatur for fasen i °C. */
  tempC: number;
  /** Relativ fermenteringshastighed, hvor 20 °C = 1,0. */
  rate: number;
}

/** Resultatet af fermenteringsmotoren – uden klokkeslæt. */
export interface FermentationPlan {
  strategy: FermentationStrategyId;
  method: DoughMethod;
  /** Det forløb der faktisk blev valgt (aldrig 'auto'). */
  route: Exclude<FermentationRoute, 'auto'>;
  usesFridge: boolean;
  /** Samlet varighed fra dejen røres til pizzaerne bages. */
  totalHours: number;
  /** Æltetid, altså tiden før fermenteringen for alvor tæller. */
  mixHours: number;
  phases: FermentationPhase[];
  /**
   * Fordejens modning. Ligger også som første fase i phases, men er her
   * for sig, fordi den har sin egen gærberegning.
   */
  preferment?: {
    kind: PrefermentKind;
    hours: number;
    tempC: number;
    equivalentHoursAt20: number;
  };
  /**
   * Ækvivalente timer ved 20 °C for hovedfermenteringen, altså efter den
   * endelige dej er æltet. Fordejen tæller ikke med her.
   */
  equivalentHoursAt20: number;
  /** Rumtemperatur brugt i beregningen (kan være klampet). */
  modelTempC: number;
}

/** Et trin i den kronologiske tidsplan. */
export type ScheduleStepId =
  | 'preferment'
  | 'mix'
  | 'mixed'
  | 'ball'
  | 'fridge-in'
  | 'fridge-out'
  | 'bake';

export interface ScheduleStep {
  id: ScheduleStepId;
  /** Tidspunkt (absolut). Vises altid i brugerens lokale tid. */
  time: Date;
  title: string;
  detail?: string;
  /** Om trinnet egner sig til en lokal notifikation. */
  notifiable: boolean;
}

/** Hvor god tid brugeren har. */
export type PlanClassification = 'optimal' | 'god' | 'hurtig' | 'meget-kort';

/** Advarsler og fejl fra validering og beregning. */
export type IssueCode =
  | 'serving-in-past'
  | 'too-little-time'
  | 'short-notice'
  | 'temp-outside-model'
  | 'method-needs-more-time'
  | 'route-needs-more-time'
  | 'ball-weight-out-of-range'
  | 'hydration-out-of-range'
  | 'salt-out-of-range'
  | 'pizza-count-out-of-range'
  | 'tiny-yeast-amount';

export interface Issue {
  code: IssueCode;
  /** Brugervendt tekst på dansk. */
  message: string;
}

/** Den færdige dejplan – alt UI'et skal bruge. */
export interface DoughPlan {
  input: DoughInput;
  ingredients: Ingredients;
  fermentation: FermentationPlan;
  schedule: ScheduleStep[];
  classification: PlanClassification;
  /** Kort overskrift til klassificeringen, fx "Du har god tid 👍". */
  classificationHeadline: string;
  /** Uddybende sætning under overskriften. */
  classificationBody: string;
  warnings: Issue[];
}

/** Resultat af createDoughPlan: enten en plan eller fejl der skal rettes. */
export type PlanResult =
  | { ok: true; plan: DoughPlan }
  | { ok: false; errors: Issue[] };
