/**
 * Validering af brugerinput.
 *
 * Fejl (errors) blokerer for en plan. Advarsler (warnings) gør ikke, men
 * vises tydeligt sammen med planen, så vi hverken skjuler usikkerhed eller
 * lover for meget.
 */

import { FERMENTATION, LIMITS, MODEL_TEMP_RANGE_C, PROCESS } from '../config/dough';
import type { DoughInput, Issue } from '../types';
import { hoursBetween } from '../utils/time';
import { formatTemp } from '../utils/format';

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  /** Tilgængelige timer fra nu (minus lidt luft) til servering. */
  availableHours: number;
}

export function validateInputs(input: DoughInput, now: Date = new Date()): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const rawHours = hoursBetween(now, input.servingTime);
  const availableHours = rawHours - PROCESS.leadTimeHours;

  if (rawHours <= 0) {
    errors.push({
      code: 'serving-in-past',
      message: 'Vælg et tidspunkt i fremtiden.',
    });
  } else if (availableHours < FERMENTATION.minTotalHours) {
    errors.push({
      code: 'too-little-time',
      message:
        'Der er for kort tid til at lave pizzadej. Vælg et tidspunkt mindst 3 timer ude i fremtiden.',
    });
  } else if (availableHours < FERMENTATION.coldMinTotalHours / 2) {
    warnings.push({
      code: 'short-notice',
      message: 'Du skal i gang næsten med det samme. Planen er strammet til.',
    });
  }

  if (input.pizzaCount < LIMITS.pizzaCount.min || input.pizzaCount > LIMITS.pizzaCount.max) {
    errors.push({
      code: 'pizza-count-out-of-range',
      message: `Vælg mellem ${LIMITS.pizzaCount.min} og ${LIMITS.pizzaCount.max} pizzaer.`,
    });
  }

  if (input.ballWeightG < LIMITS.ballWeightG.min || input.ballWeightG > LIMITS.ballWeightG.max) {
    errors.push({
      code: 'ball-weight-out-of-range',
      message: `En dejbold skal veje mellem ${LIMITS.ballWeightG.min} og ${LIMITS.ballWeightG.max} g.`,
    });
  }

  if (input.hydration < LIMITS.hydration.min || input.hydration > LIMITS.hydration.max) {
    errors.push({
      code: 'hydration-out-of-range',
      message: `Vandmængden skal være mellem ${Math.round(LIMITS.hydration.min * 100)} og ${Math.round(
        LIMITS.hydration.max * 100,
      )} % af melet.`,
    });
  }

  if (input.salt < LIMITS.salt.min || input.salt > LIMITS.salt.max) {
    errors.push({
      code: 'salt-out-of-range',
      message: `Saltmængden skal være mellem ${(LIMITS.salt.min * 100)
        .toFixed(1)
        .replace('.', ',')} og ${(LIMITS.salt.max * 100).toFixed(1).replace('.', ',')} % af melet.`,
    });
  }

  if (input.roomTempC < LIMITS.roomTempC.min || input.roomTempC > LIMITS.roomTempC.max) {
    errors.push({
      code: 'temp-outside-model',
      message: `Angiv en temperatur mellem ${LIMITS.roomTempC.min} og ${LIMITS.roomTempC.max} °C.`,
    });
  } else if (
    input.roomTempC < MODEL_TEMP_RANGE_C.min ||
    input.roomTempC > MODEL_TEMP_RANGE_C.max
  ) {
    warnings.push({
      code: 'temp-outside-model',
      message: `${formatTemp(input.roomTempC)} ligger uden for det, PizzaPlan regner sikkert på. Vi regner som ved ${formatTemp(
        Math.min(Math.max(input.roomTempC, MODEL_TEMP_RANGE_C.min), MODEL_TEMP_RANGE_C.max),
      )}, så hold ekstra øje med dejen.`,
    });
  }

  return { errors, warnings, availableHours };
}
