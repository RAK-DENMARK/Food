/**
 * Samler hele domænelaget til én funktion, UI'et kan kalde.
 *
 *   input  ->  validering  ->  metode og fermenteringsforløb  ->  gær
 *          ->  ingredienser  ->  tidsplan  ->  klassificering
 *
 * UI'et kender kun denne funktion og de rene datatyper.
 */

import { PREFERMENTS, PREFERMENT_LEAVENING_CREDIT, PRECISION_SCALE_YEAST_G } from '../config/dough';
import type { DoughInput, DoughPlan, Issue, PlanResult } from '../types';
import { classificationBody, classificationHeadline, classifySchedule } from './classification';
import { calculateYeastPercent, selectFermentationStrategy } from './fermentation';
import { calculateIngredients, type PrefermentSpec } from './ingredients';
import { createDoughSchedule } from './schedule';
import { validateInputs } from './validation';

export function createDoughPlan(input: DoughInput, now: Date = new Date()): PlanResult {
  const validation = validateInputs(input, now);
  if (validation.errors.length > 0) {
    return { ok: false, errors: validation.errors };
  }

  const strategy = selectFermentationStrategy({
    availableHours: validation.availableHours,
    roomTempC: input.roomTempC,
    method: input.method,
    route: input.route,
  });
  if (!strategy.ok) {
    return { ok: false, errors: [strategy.issue] };
  }
  const fermentation = strategy.plan;

  // Fordejen har sin egen gærberegning ud fra sin egen modningstid.
  // Den endelige dej får mindre gær, fordi en moden fordej allerede
  // indeholder en stor, aktiv gærbestand.
  let preferment: PrefermentSpec | undefined;
  if (fermentation.preferment) {
    const spec = PREFERMENTS[fermentation.preferment.kind];
    preferment = {
      kind: fermentation.preferment.kind,
      flourShare: spec.flourShare,
      hydration: spec.hydration,
      yeastPercent: calculateYeastPercent(fermentation.preferment.equivalentHoursAt20),
      hours: fermentation.preferment.hours,
    };
  }

  const mainYeastPercent =
    calculateYeastPercent(fermentation.equivalentHoursAt20) *
    (preferment ? PREFERMENT_LEAVENING_CREDIT : 1);

  const ingredients = calculateIngredients({
    pizzaCount: input.pizzaCount,
    ballWeightG: input.ballWeightG,
    hydration: input.hydration,
    salt: input.salt,
    yeastPercent: mainYeastPercent,
    yeastType: input.yeastType,
    preferment,
  });

  // Planen starter så sent som muligt: varigheden er lagt fast af strategien,
  // og tidsplanen bygges baglæns fra serveringstidspunktet.
  const schedule = createDoughSchedule({
    fermentation,
    ingredients,
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
    classificationBody: classificationBody(classification, fermentation.usesFridge),
    warnings,
  };

  return { ok: true, plan };
}
