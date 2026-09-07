/**
 * Tidsplansgenerator.
 *
 * Planen bygges BAGLÆNS fra serveringstidspunktet, fordi det er brugerens
 * faste punkt: "jeg vil spise pizza lørdag kl. 18".
 *
 * Fagudtrykkene bruges ikke i trinnenes overskrifter – de står i forklaringen
 * på resultatskærmen. Rækkefølgen svarer til den klassiske napolitanske:
 * eventuel fordej, æltning, puntata (samlet hævning), staglio (dejbollerne
 * formes) og appretto (bollerne hæver færdig).
 *
 * Alle tidspunkter er absolutte Date-objekter og vises i lokal tid.
 */

import { PROCESS } from '../config/dough';
import type { FermentationPlan, Ingredients, ScheduleStep } from '../types';
import { formatDurationHours, formatGrams, formatSalt, formatYeast } from '../utils/format';
import { subtractHours } from '../utils/time';

export interface ScheduleArgs {
  fermentation: FermentationPlan;
  ingredients: Ingredients;
  servingTime: Date;
  pizzaCount: number;
  ballWeightG: number;
}

function phaseHours(plan: FermentationPlan, kind: string): number {
  return plan.phases
    .filter((phase) => phase.kind === kind)
    .reduce((sum, phase) => sum + phase.hours, 0);
}

/** Gærmængder under et halvt kvart gram nævnes ikke i instruktionen. */
function mentionable(grams: number): boolean {
  return grams >= 0.05;
}

/**
 * Sætter sætninger sammen uden dobbelt punktum – formaterede varigheder
 * slutter selv på "min.".
 */
function sentences(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');
}

const PREFERMENT_NAMES = {
  poolish: { definite: 'poolishen', indefinite: 'en poolish' },
  biga: { definite: 'bigaen', indefinite: 'en biga' },
} as const;

/** Bygger den kronologiske tidsplan for en fermenteringsplan. */
export function createDoughSchedule(args: ScheduleArgs): ScheduleStep[] {
  const { fermentation, ingredients, servingTime, pizzaCount, ballWeightG } = args;

  const bulkHours = phaseHours(fermentation, 'bulk-room');
  const steps: ScheduleStep[] = [];

  let ballTime: Date;

  if (fermentation.usesFridge) {
    const temper = phaseHours(fermentation, 'temper');
    const fridge = phaseHours(fermentation, 'fridge') + phaseHours(fermentation, 'fridge-cooldown');
    const fridgeOut = subtractHours(servingTime, temper);
    const fridgeIn = subtractHours(fridgeOut, fridge);
    ballTime = subtractHours(fridgeIn, PROCESS.chillLagHours);

    steps.push({
      id: 'fridge-in',
      time: fridgeIn,
      title: 'Sæt dejbollerne på køl',
      detail: 'Læg dem i en lufttæt bøtte eller på en bakke med låg i køleskabet.',
      notifiable: true,
    });
    steps.push({
      id: 'fridge-out',
      time: fridgeOut,
      title: 'Tag dejbollerne ud',
        detail: sentences(`De skal stå ${formatDurationHours(temper)} ved stuetemperatur, før de er klar`),
      notifiable: true,
    });
  } else {
    const ballHours = phaseHours(fermentation, 'balls-room');
    ballTime = subtractHours(servingTime, ballHours);
  }

  const mixedTime = subtractHours(ballTime, bulkHours);
  const mixTime = subtractHours(mixedTime, fermentation.mixHours);

  const preferment = ingredients.preferment;
  if (preferment) {
    const names = PREFERMENT_NAMES[preferment.kind];
    const prefermentTime = subtractHours(mixTime, preferment.hours);
    // Fordejen er klar, når den ser klar ud – tiden er et pejlemærke, ikke en facitliste.
    const texture =
      preferment.kind === 'poolish'
        ? 'Rør det sammen til en tyk vælling.'
        : 'Bland det kort sammen til en grov, klumpet dej – den skal ikke æltes glat.';
    const ripeness =
      preferment.kind === 'poolish'
        ? 'Den er klar, når overfladen bobler og midten lige er begyndt at synke.'
        : 'Den er klar, når den er hævet godt op og dufter syrligt og sødt.';

    steps.push({
      id: 'preferment',
      time: prefermentTime,
      title: `Lav ${names.definite}`,
      detail: sentences(
        `${formatGrams(preferment.flourG)} mel, ${formatGrams(preferment.waterG)} vand og ${formatYeast(
          preferment.yeastG,
        )} gær`,
        texture,
        `Lad den stå tildækket i ${formatDurationHours(preferment.hours)}`,
        ripeness,
      ),
      notifiable: true,
    });
  }

  steps.push({
    id: 'mix',
    time: mixTime,
    title: 'Lav dejen',
    detail: mixInstruction(ingredients),
    notifiable: true,
  });
  steps.push({
    id: 'mixed',
    time: mixedTime,
    title: 'Dejen er færdigæltet',
    detail: sentences(`Lad den hvile tildækket ved stuetemperatur i ${formatDurationHours(bulkHours)}`),
    notifiable: false,
  });
  steps.push({
    id: 'ball',
    time: ballTime,
    title: 'Lav dejbollerne',
    detail: `Del dejen i ${pizzaCount} portioner á cirka ${Math.round(ballWeightG)} g, og form dem til stramme bolde.`,
    notifiable: true,
  });
  steps.push({
    id: 'bake',
    time: servingTime,
    title: '🍕 Bag pizza',
    detail: 'Dejen er klar. Stræk den forsigtigt ud fra midten.',
    notifiable: true,
  });

  return steps.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** Instruktionen til æltningen, med de mængder der faktisk skal i skålen. */
function mixInstruction(ingredients: Ingredients): string {
  const { finalDough, preferment } = ingredients;

  if (preferment) {
    const names = PREFERMENT_NAMES[preferment.kind];
    const extraYeast = mentionable(finalDough.yeastG)
      ? ` og ${formatYeast(finalDough.yeastG)} gær`
      : '';
    return `Bland ${names.definite} med ${formatGrams(finalDough.waterG)} vand, ${formatGrams(
      finalDough.flourG,
    )} mel, ${formatSalt(finalDough.saltG)} salt${extraYeast}, og ælt dejen glat.`;
  }

  return `Rør ${formatYeast(finalDough.yeastG)} gær ud i ${formatGrams(
    finalDough.waterG,
  )} vand, tilsæt ${formatGrams(finalDough.flourG)} mel og ${formatSalt(
    finalDough.saltG,
  )} salt, og ælt dejen glat.`;
}
