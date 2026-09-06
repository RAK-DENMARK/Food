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
  /** Hvornår pizzaerne skal spises (lokal tid). */
  servingTime: Date;
}

/** Ingredienser beregnet med fuld præcision. Afrunding sker først i visningen. */
export interface Ingredients {
  totalDoughG: number;
  flourG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
  /** Gær som bagerprocent af mel, fx 0,0012. */
  yeastPercent: number;
  yeastType: YeastType;
}

/** Fermenteringsstrategi valgt af motoren. */
export type FermentationStrategyId =
  | 'very-short-room'
  | 'same-day-room'
  | 'room-temp'
  | 'cold-ferment';

/** En fase i fermenteringen med en antaget temperatur. */
export type FermentationPhaseKind =
  | 'bulk-room'
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
  usesFridge: boolean;
  /** Samlet varighed fra dejen røres til pizzaerne bages. */
  totalHours: number;
  /** Æltetid, altså tiden før fermenteringen for alvor tæller. */
  mixHours: number;
  phases: FermentationPhase[];
  /** Summen af fasernes timer vægtet med hastigheden, målt ved 20 °C. */
  equivalentHoursAt20: number;
  /** Rumtemperatur brugt i beregningen (kan være klampet). */
  modelTempC: number;
}

/** Et trin i den kronologiske tidsplan. */
export type ScheduleStepId =
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
