/**
 * Fermenteringsmotor.
 *
 * Modellen er bevidst REGELBASERET og dokumenteret frem for at være en
 * formel, der ser præcis ud uden at være det. Antagelser og kilder står i
 * docs/FERMENTERING.md. Alle tal kommer fra src/config/dough.ts.
 *
 * Modellen skelner mellem to ting, der ofte blandes sammen:
 *
 *   METODE  – direkte dej (impasto diretto) eller indirekte med fordej
 *             (poolish eller biga). Det er den egentlige dejtype.
 *   FORLØB  – hvor dejen hæver: stuetemperatur eller køleskab.
 *             "24 timer" og "48 timer" er forløb, ikke dejtyper.
 *
 * Motoren har fire dele:
 *
 *  1. En temperaturfaktor, der oversætter en times hævning ved temperatur T
 *     til "ækvivalente timer ved 20 °C". Tommelfingerregel: hastigheden
 *     fordobles pr. +10 °C i intervallet ca. 12-32 °C.
 *
 *  2. En fordejsmodning, hvis metoden er indirekte.
 *
 *  3. En strategivælger, der lægger hovedforløbet af faser.
 *
 *  4. En ankertabel, der oversætter ækvivalente timer til en gærprocent.
 *     Tabellen interpoleres logaritmisk og er nem at justere ét sted.
 *
 * Motoren kender hverken til React, klokkeslæt eller formatering.
 */

import {
  FERMENTATION,
  METHOD_MIN_TOTAL_HOURS,
  MODEL_TEMP_RANGE_C,
  PREFERMENTS,
  PROCESS,
  ROOM_MAX_TOTAL_HOURS,
  YEAST_ANCHORS_IDY,
  YEAST_PERCENT_LIMITS,
} from '../config/dough';
import type {
  DoughMethod,
  FermentationPhase,
  FermentationPlan,
  FermentationRoute,
  FermentationStrategyId,
  Issue,
  PrefermentKind,
} from '../types';

const REFERENCE_TEMP_C = 20;
/** Hastigheden fordobles pr. denne temperaturforskel. */
const DOUBLING_INTERVAL_C = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Runder til nærmeste kvarte time, så planen bliver til at læse. */
function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/**
 * Relativ fermenteringshastighed ved stuetemperatur, hvor 20 °C = 1,0.
 *
 * Temperaturen klampes til det interval, modellen er underbygget i.
 * Vi ekstrapolerer bevidst ikke ned til køleskabstemperatur med denne
 * kurve – køl har sine egne, separat dokumenterede faktorer.
 */
export function roomRateFactor(tempC: number): number {
  const t = clamp(tempC, MODEL_TEMP_RANGE_C.min, MODEL_TEMP_RANGE_C.max);
  return Math.pow(2, (t - REFERENCE_TEMP_C) / DOUBLING_INTERVAL_C);
}

/**
 * Hvor længe dejbollerne skal ud af køleskabet før bagning.
 * 4 timer ved 20 °C, kortere i et varmt køkken, længere i et koldt.
 */
export function temperHours(roomTempC: number): number {
  const hours = FERMENTATION.temperBaseHours / roomRateFactor(roomTempC);
  return roundToQuarter(clamp(hours, FERMENTATION.temperMinHours, FERMENTATION.temperMaxHours));
}

/**
 * Fordejens modningstid ved den givne rumtemperatur.
 * En poolish er klar efter ca. 12 timer ved 20 °C, en biga efter ca. 14.
 */
export function prefermentHours(kind: PrefermentKind, roomTempC: number): number {
  const spec = PREFERMENTS[kind];
  const hours = spec.baseHours / roomRateFactor(roomTempC);
  return roundToQuarter(clamp(hours, spec.minHours, spec.maxHours));
}

/** Summen af fasernes timer vægtet med deres hastighed. */
export function equivalentHoursAt20(phases: FermentationPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.hours * phase.rate, 0);
}

function roomPhase(
  kind: 'preferment' | 'bulk-room' | 'balls-room' | 'temper',
  hours: number,
  tempC: number,
): FermentationPhase {
  return { kind, hours, tempC, rate: roomRateFactor(tempC) };
}

export interface StrategyRequest {
  /** Timer fra nu (minus lidt luft) til servering. */
  availableHours: number;
  roomTempC: number;
  method: DoughMethod;
  route: FermentationRoute;
}

export type StrategyResult =
  | { ok: true; plan: FermentationPlan }
  | { ok: false; issue: Issue };

/** Mindste hovedfermentering, der overhovedet giver en dej. */
function minMainHours(): number {
  return FERMENTATION.minTotalHours;
}

/** Mindste hovedfermentering for at et køleophold kan betale sig. */
function minColdMainHours(roomTempC: number): number {
  return (
    PROCESS.mixHours +
    FERMENTATION.coldBulkHours +
    PROCESS.chillLagHours +
    temperHours(roomTempC) +
    FERMENTATION.minFridgeHours
  );
}

/**
 * Vælger fermenteringsstrategi ud fra metode, ønsket forløb og tilgængelig tid.
 *
 * Planen bliver aldrig længere end nødvendigt: et stuetemperaturforløb stopper
 * ved 24 timer, et koldt ved 48. En bruger med tre dages varsel får derfor en
 * senere starttid – ikke besked på at gå i gang med det samme.
 */
export function selectFermentationStrategy(request: StrategyRequest): StrategyResult {
  const { availableHours, roomTempC, method } = request;

  if (availableHours < METHOD_MIN_TOTAL_HOURS[method]) {
    return { ok: false, issue: notEnoughTimeForMethod(method) };
  }

  const preferment =
    method === 'direct'
      ? null
      : (() => {
          const kind = method as PrefermentKind;
          const hours = prefermentHours(kind, roomTempC);
          const phase = roomPhase('preferment', hours, roomTempC);
          return { kind, hours, phase };
        })();

  const prefHours = preferment?.hours ?? 0;
  const mainAvailable = availableHours - prefHours;

  const route = resolveRoute(request, mainAvailable, roomTempC);
  if (route.ok === false) return route;

  // Loftet gælder HELE planen. En fordej lægger sig altså ikke oven i loftet,
  // men spiser af den tid, hovedfermenteringen får.
  const totalCap = route.value === 'cold' ? FERMENTATION.preferredMaxTotalHours : ROOM_MAX_TOTAL_HOURS;
  const mainHours = roundToQuarter(Math.min(mainAvailable, totalCap - prefHours));

  if (mainHours < minMainHours()) {
    return { ok: false, issue: notEnoughTimeForMethod(method) };
  }

  const mainPhases =
    route.value === 'cold'
      ? coldPhases(mainHours, roomTempC)
      : roomPhases(mainHours, roomTempC);

  const phases = preferment ? [preferment.phase, ...mainPhases] : mainPhases;

  const plan: FermentationPlan = {
    strategy: `${method === 'direct' ? 'direct' : method}-${route.value}` as FermentationStrategyId,
    method,
    route: route.value,
    usesFridge: route.value === 'cold',
    totalHours: roundToQuarter(prefHours + mainHours),
    mixHours: PROCESS.mixHours,
    phases,
    preferment: preferment
      ? {
          kind: preferment.kind,
          hours: preferment.hours,
          tempC: roomTempC,
          equivalentHoursAt20: equivalentHoursAt20([preferment.phase]),
        }
      : undefined,
    // Kun hovedfermenteringen tæller med her. Fordejen har sin egen gær.
    equivalentHoursAt20: equivalentHoursAt20(mainPhases),
    modelTempC: clamp(roomTempC, MODEL_TEMP_RANGE_C.min, MODEL_TEMP_RANGE_C.max),
  };

  return { ok: true, plan };
}

/** Afgør om hovedfermenteringen skal stå fremme eller på køl. */
function resolveRoute(
  request: StrategyRequest,
  mainAvailable: number,
  roomTempC: number,
): { ok: true; value: 'room' | 'cold' } | { ok: false; issue: Issue } {
  const coldFits = mainAvailable >= Math.max(FERMENTATION.coldMinTotalHours, minColdMainHours(roomTempC));

  if (request.route === 'cold') {
    if (!coldFits) {
      return {
        ok: false,
        issue: {
          code: 'route-needs-more-time',
          message:
            'Der er ikke tid nok til at hæve på køl. Vælg stuetemperatur, eller vælg et senere tidspunkt.',
        },
      };
    }
    return { ok: true, value: 'cold' };
  }

  if (request.route === 'room') return { ok: true, value: 'room' };

  return { ok: true, value: coldFits ? 'cold' : 'room' };
}

/** Bulk (puntata) ved stuetemperatur, køl som dejbolde, temperering til sidst. */
function coldPhases(mainHours: number, roomTempC: number): FermentationPhase[] {
  const temper = temperHours(roomTempC);
  const fridgeHours = roundToQuarter(
    mainHours - PROCESS.mixHours - FERMENTATION.coldBulkHours - PROCESS.chillLagHours - temper,
  );
  const cooldown = Math.min(FERMENTATION.fridgeCooldownHours, fridgeHours);

  const phases: FermentationPhase[] = [
    roomPhase('bulk-room', FERMENTATION.coldBulkHours, roomTempC),
    {
      kind: 'fridge-cooldown',
      hours: cooldown,
      tempC: FERMENTATION.fridgeTempC,
      rate: FERMENTATION.fridgeCooldownRate,
    },
    {
      kind: 'fridge',
      hours: fridgeHours - cooldown,
      tempC: FERMENTATION.fridgeTempC,
      rate: FERMENTATION.fridgeRate,
    },
    roomPhase('temper', temper, roomTempC),
  ];
  return phases.filter((phase) => phase.hours > 0);
}

/** Puntata og appretto, begge ved stuetemperatur. */
function roomPhases(mainHours: number, roomTempC: number): FermentationPhase[] {
  const fermentHours = Math.max(mainHours - PROCESS.mixHours, 0);
  const bulkHours = roundToQuarter(
    clamp(
      fermentHours * FERMENTATION.roomBulkShare,
      FERMENTATION.roomBulkMinHours,
      FERMENTATION.roomBulkMaxHours,
    ),
  );
  const ballHours = Math.max(roundToQuarter(fermentHours - bulkHours), 0.25);
  return [roomPhase('bulk-room', bulkHours, roomTempC), roomPhase('balls-room', ballHours, roomTempC)];
}

function notEnoughTimeForMethod(method: DoughMethod): Issue {
  if (method === 'direct') {
    return {
      code: 'too-little-time',
      message:
        'Der er for kort tid til at lave pizzadej. Vælg et tidspunkt mindst 3 timer ude i fremtiden.',
    };
  }
  const hours = METHOD_MIN_TOTAL_HOURS[method];
  const name = method === 'poolish' ? 'En poolish' : 'En biga';
  return {
    code: 'method-needs-more-time',
    message: `${name} skal modne, før dejen kan laves. Det kræver mindst ${hours} timer i alt. Vælg en direkte dej, eller vælg et senere tidspunkt.`,
  };
}

/**
 * Oversætter ækvivalente timer ved 20 °C til gær som bagerprocent (IDY).
 *
 * Der interpoleres logaritmisk mellem ankerpunkterne i konfigurationen,
 * fordi sammenhængen i praksis er tæt på omvendt proportional: dobbelt så
 * lang tid ~ halv så meget gær. Uden for tabellen klampes der.
 */
export function calculateYeastPercent(equivalentHours: number): number {
  const anchors = YEAST_ANCHORS_IDY;
  const hours = Math.max(equivalentHours, 0.25);

  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (hours <= first.hours) return clampYeast(first.percent);
  if (hours >= last.hours) return clampYeast(last.percent);

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (hours >= a.hours && hours <= b.hours) {
      const t = (Math.log(hours) - Math.log(a.hours)) / (Math.log(b.hours) - Math.log(a.hours));
      const percent = Math.exp(Math.log(a.percent) + t * (Math.log(b.percent) - Math.log(a.percent)));
      return clampYeast(percent);
    }
  }
  return clampYeast(last.percent);
}

function clampYeast(percent: number): number {
  return clamp(percent, YEAST_PERCENT_LIMITS.min, YEAST_PERCENT_LIMITS.max);
}
