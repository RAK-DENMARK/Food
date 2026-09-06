/**
 * Korte forklaringer på dansk af, hvorfor planen ser ud som den gør.
 *
 * Teksterne hører til produktets faglige ærlighed og ligger derfor i
 * domænelaget, hvor de kan testes – ikke inde i en komponent.
 */

import { FERMENTATION, MODEL_TEMP_RANGE_C } from '../config/dough';
import type { DoughPlan, FermentationStrategyId } from '../types';
import { formatDurationHours, formatPercent, formatTemp } from '../utils/format';

const STRATEGY_TEXTS: Record<FermentationStrategyId, string> = {
  'cold-ferment':
    'Dejen hæver først kort ved stuetemperatur, står derefter på køl og tempereres til sidst. Køleskabet gør hævningen langsom og kontrolleret, og det er dér smagen kommer fra.',
  'room-temp':
    'Hele hævningen foregår ved stuetemperatur. Der er ikke tid nok til, at et ophold i køleskabet giver mening.',
  'same-day-room':
    'Dejen hæver ved stuetemperatur samme dag. Vi bruger lidt mere gær, så den når at hæve færdig.',
  'very-short-room':
    'Der er meget kort tid, så dejen hæver hurtigt ved stuetemperatur med en større mængde gær.',
};

/** Punktvis forklaring til "Hvorfor?" på resultatskærmen. */
export function explainPlan(plan: DoughPlan): string[] {
  const { fermentation, ingredients, input } = plan;
  const lines: string[] = [];

  lines.push(
    `Du har ${formatDurationHours(fermentation.totalHours)} fra du går i gang, til pizzaerne skal spises.`,
  );
  lines.push(STRATEGY_TEXTS[fermentation.strategy]);
  lines.push(
    `Gærmængden (${formatPercent(ingredients.yeastPercent)} af melet) er valgt ud fra hævetiden ved ${formatTemp(
      input.roomTempC,
    )}. Kortere tid kræver mere gær, længere tid kræver mindre.`,
  );

  if (fermentation.usesFridge) {
    lines.push(
      `Køleskabet regnes som ${formatTemp(FERMENTATION.fridgeTempC)}, hvor dejen hæver cirka ${Math.round(
        1 / FERMENTATION.fridgeRate,
      )} gange langsommere end ved 20 °C.`,
    );
  }

  lines.push(
    'PizzaPlan bruger rumtemperaturen som pejlemærke for dejens temperatur. De to er ikke helt det samme, så betragt tidsplanen som et godt udgangspunkt – ikke en facitliste. Kig altid på dejen.',
  );

  if (input.roomTempC < MODEL_TEMP_RANGE_C.min || input.roomTempC > MODEL_TEMP_RANGE_C.max) {
    lines.push(
      `Din temperatur ligger uden for det interval (${MODEL_TEMP_RANGE_C.min}–${MODEL_TEMP_RANGE_C.max} °C), som beregningen er lavet til. Derfor er planen mere usikker end normalt.`,
    );
  }

  return lines;
}
