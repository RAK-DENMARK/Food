/**
 * Samler hele domænelaget til én funktion, UI'et kan kalde.
 *
 *   input  ->  validering  ->  fermenteringsstrategi  ->  gær
 *          ->  ingredienser  ->  tidsplan  ->  klassificering
 *
 * UI'et kender kun denne funktion og de rene datatyper.
 */

import { PRECISION_SCALE_YEAST_G } from '../config/dough';
import type { DoughInput, DoughPlan, Issue, PlanResult } from '../types';
import { classificationBody, classificationHeadline, classifySchedule } from './classification';
import { calculateYeastPercent, selectFermentationStrategy } from './fermentation';
import { calculateIngredients } from './ingredients';
import { createDoughSchedule } from './schedule';
import { validateInputs } from './validation';

export function createDoughPlan(input: DoughInput, now: Date = new Date()): PlanResult {
  const validation = validateInputs(input, now);
  if (validation.errors.length > 0) {
    return { ok: false, errors: validation.errors };
  }

  const fermentation = selectFermentationStrategy(validation.availableHours, input.roomTempC);
  if (!fermentation) {
    return {
      ok: false,
      errors: [
        {
          code: 'too-little-time',
          message:
            'Der er for kort tid til at lave pizzadej. Vælg et tidspunkt mindst 3 timer ude i fremtiden.',
        },
      ],
    };
  }

  const yeastPercent = calculateYeastPercent(fermentation.equivalentHoursAt20);
  const ingredients = calculateIngredients({
    pizzaCount: input.pizzaCount,
    ballWeightG: input.ballWeightG,
    hydration: input.hydration,
    salt: input.salt,
    yeastPercent,
    yeastType: input.yeastType,
  });

  // Planen starter så sent som muligt, men aldrig senere end nødvendigt:
  // varigheden er allerede lagt fast af strategien, og tidsplanen bygges
  // baglæns fra serveringstidspunktet.
  const schedule = createDoughSchedule({
    fermentation,
    servingTime: input.servingTime,
    pizzaCount: input.pizzaCount,
    ballWeightG: input.ballWeightG,
  });

  const classification = classifySchedule(fermentation.totalHours);
  const warnings: Issue[] = [...validation.warnings];

  if (ingredients.yeastG < PRECISION_SCALE_YEAST_G) {
    warnings.push({
      code: 'tiny-yeast-amount',
      message:
        'Gærmængden er meget lille. Den kræver en præcisionsvægt – ellers brug et knivspids-skøn og forvent lidt større udsving.',
    });
  }

  const plan: DoughPlan = {
    input,
    ingredients,
    fermentation,
    schedule,
    classification,
    classificationHeadline: classificationHeadline(classification),
    classificationBody: classificationBody(classification),
    warnings,
  };

  return { ok: true, plan };
}
