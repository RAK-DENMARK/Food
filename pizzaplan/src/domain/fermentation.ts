/**
 * Fermenteringsmotor.
 *
 * Modellen er bevidst REGELBASERET og dokumenteret frem for at være en
 * formel, der ser præcis ud uden at være det. Antagelser og kilder står i
 * docs/FERMENTERING.md. Alle tal kommer fra src/config/dough.ts.
 *
 * Modellen har tre dele:
 *
 *  1. En temperaturfaktor, der oversætter en times hævning ved temperatur T
 *     til "ækvivalente timer ved 20 °C". Tommelfingerregel: hastigheden
 *     fordobles pr. +10 °C i intervallet ca. 12-32 °C.
 *
 *  2. En strategivælger, der ud fra den tilgængelige tid lægger et forløb af
 *     faser (bulk ved stuetemperatur, eventuelt køleskab, temperering).
 *
 *  3. En ankertabel, der oversætter ækvivalente timer til en gærprocent.
 *     Tabellen interpoleres logaritmisk og er nem at justere ét sted.
 *
 * Motoren kender hverken til React, klokkeslæt eller formatering.
 */

import { FERMENTATION, MODEL_TEMP_RANGE_C, PROCESS, YEAST_ANCHORS_IDY, YEAST_PERCENT_LIMITS } from '../config/dough';
import type { FermentationPhase, FermentationPlan, FermentationStrategyId } from '../types';

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

/** Summen af fasernes timer vægtet med deres hastighed. */
export function equivalentHoursAt20(phases: FermentationPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.hours * phase.rate, 0);
}

function roomPhase(kind: 'bulk-room' | 'balls-room' | 'temper', hours: number, tempC: number): FermentationPhase {
  return { kind, hours, tempC, rate: roomRateFactor(tempC) };
}

/**
 * Vælger fermenteringsstrategi ud fra den tilgængelige tid.
 *
 * availableHours er tiden fra "nu" (plus lidt luft) til serveringstidspunktet.
 * Planen bliver aldrig længere end FERMENTATION.preferredMaxTotalHours, så en
 * bruger med tre dages varsel ikke får besked på at gå i gang med det samme.
 *
 * Returnerer null, hvis der simpelthen er for lidt tid.
 */
export function selectFermentationStrategy(
  availableHours: number,
  roomTempC: number,
): FermentationPlan | null {
  if (availableHours < FERMENTATION.minTotalHours) return null;

  const totalHours = roundToQuarter(
    Math.min(availableHours, FERMENTATION.preferredMaxTotalHours),
  );
  const mixHours = PROCESS.mixHours;
  const temper = temperHours(roomTempC);

  const fridgeHours = roundToQuarter(
    totalHours - mixHours - FERMENTATION.coldBulkHours - PROCESS.chillLagHours - temper,
  );
  const useFridge =
    totalHours >= FERMENTATION.coldMinTotalHours && fridgeHours >= FERMENTATION.minFridgeHours;

  if (useFridge) {
    const cooldown = Math.min(FERMENTATION.fridgeCooldownHours, fridgeHours);
    const coldPhases: FermentationPhase[] = [
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
    const phases = coldPhases.filter((phase) => phase.hours > 0);

    return {
      strategy: 'cold-ferment',
      usesFridge: true,
      totalHours,
      mixHours,
      phases,
      equivalentHoursAt20: equivalentHoursAt20(phases),
      modelTempC: clamp(roomTempC, MODEL_TEMP_RANGE_C.min, MODEL_TEMP_RANGE_C.max),
    };
  }

  // Alt ved stuetemperatur: bulk først, derefter dejbolde frem til bagning.
  const fermentHours = Math.max(totalHours - mixHours, 0);
  const bulkHours = roundToQuarter(
    clamp(
      fermentHours * FERMENTATION.roomBulkShare,
      FERMENTATION.roomBulkMinHours,
      FERMENTATION.roomBulkMaxHours,
    ),
  );
  const ballHours = Math.max(roundToQuarter(fermentHours - bulkHours), 0.25);
  const phases: FermentationPhase[] = [
    roomPhase('bulk-room', bulkHours, roomTempC),
    roomPhase('balls-room', ballHours, roomTempC),
  ];

  let strategy: FermentationStrategyId = 'room-temp';
  if (totalHours < 4) strategy = 'very-short-room';
  else if (totalHours < 10) strategy = 'same-day-room';

  return {
    strategy,
    usesFridge: false,
    totalHours,
    mixHours,
    phases,
    equivalentHoursAt20: equivalentHoursAt20(phases),
    modelTempC: clamp(roomTempC, MODEL_TEMP_RANGE_C.min, MODEL_TEMP_RANGE_C.max),
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
