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
import { calculateYeastPercent, capYeastForLongPlan, selectFermentationStrategy } from './fermentation';
import { calculateIngredients, type PrefermentSpec } from './ingredients';
import { createDoughSchedule } from './schedule';
import { validateInputs } from './validation';

/**
 * Råd ved meget små gærmængder.
 *
 * En lang hævning bruger så lidt gær, at et almindeligt køkkenvægt ikke kan
 * veje den. Fortyndingsmetoden er den praktiske udvej: 1 g gær i 100 ml af
 * opskriftens vand giver 0,01 g gær pr. ml.
 */
export function tinyYeastAdvice(yeastG: number): string {
  const millilitres = Math.round(yeastG * 100);
  return `Gærmængden er så lille, at den kræver en præcisionsvægt. Ellers: rør 1 g gær ud i 100 ml af opskriftens vand, brug ${millilitres} ml af blandingen, og kassér resten.`;
}

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
      // Fordejens egen gær ud fra dens egen modningstid, korrigeret for
      // hvor tør fordejen er.
      yeastPercent:
        calculateYeastPercent(fermentation.preferment.equivalentHoursAt20) * spec.yeastFactor,
      hours: fermentation.preferment.hours,
    };
  }

  // Loftet for lange planer gælder den gær, der kommer i den endelige dej.
  // Fordejens egen gær er styret af sin egen, kortere modningstid.
  const mainYeastPercent = capYeastForLongPlan(
    calculateYeastPercent(fermentation.equivalentHoursAt20) *
      (preferment ? PREFERMENT_LEAVENING_CREDIT : 1),
    fermentation.totalHours,
  );

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
      message: tinyYeastAdvice(ingredients.yeastG),
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
