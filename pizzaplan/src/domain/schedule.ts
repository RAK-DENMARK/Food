/**
 * Tidsplansgenerator.
 *
 * Planen bygges BAGLÆNS fra serveringstidspunktet, fordi det er brugerens
 * faste punkt: "jeg vil spise pizza lørdag kl. 18".
 *
 * Alle tidspunkter er absolutte Date-objekter og vises i lokal tid.
 * Der formateres ikke her – det hører til i UI-laget.
 */

import { PROCESS } from '../config/dough';
import type { FermentationPlan, ScheduleStep } from '../types';
import { formatDurationHours } from '../utils/format';
import { subtractHours } from '../utils/time';

export interface ScheduleArgs {
  fermentation: FermentationPlan;
  servingTime: Date;
  pizzaCount: number;
  ballWeightG: number;
}

function phaseHours(plan: FermentationPlan, kind: string): number {
  return plan.phases
    .filter((phase) => phase.kind === kind)
    .reduce((sum, phase) => sum + phase.hours, 0);
}

/** Bygger den kronologiske tidsplan for en fermenteringsplan. */
export function createDoughSchedule(args: ScheduleArgs): ScheduleStep[] {
  const { fermentation, servingTime, pizzaCount, ballWeightG } = args;

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
      detail: `De skal stå ${formatDurationHours(temper)} ved stuetemperatur, før de er klar.`,
      notifiable: true,
    });
  } else {
    const ballHours = phaseHours(fermentation, 'balls-room');
    ballTime = subtractHours(servingTime, ballHours);
  }

  const mixedTime = subtractHours(ballTime, bulkHours);
  const mixTime = subtractHours(mixedTime, fermentation.mixHours);

  steps.push({
    id: 'mix',
    time: mixTime,
    title: 'Lav dejen',
    detail: 'Rør gæren ud i vandet, tilsæt mel og salt, og ælt dejen glat.',
    notifiable: true,
  });
  steps.push({
    id: 'mixed',
    time: mixedTime,
    title: 'Dejen er færdigæltet',
    detail: `Lad den hvile tildækket ved stuetemperatur i ${formatDurationHours(bulkHours)}.`,
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
