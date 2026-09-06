/**
 * Ingrediensberegning efter bagerprocent.
 *
 *   Samlet dejvægt = M x (1 + H + S + Y)
 *   =>  M = samlet dejvægt / (1 + H + S + Y)
 *
 * hvor M = mel, H = hydrering, S = saltprocent, Y = gærprocent
 * (alle som decimaler af melvægten).
 *
 * Der regnes med fuld flydende præcision. Afrunding hører til i visningen
 * (se src/utils/format.ts).
 */

import { YEAST_FACTORS } from '../config/dough';
import type { Ingredients, YeastType } from '../types';

export interface IngredientArgs {
  pizzaCount: number;
  ballWeightG: number;
  hydration: number;
  salt: number;
  /** Gær som bagerprocent, fx 0,0012. Kommer fra fermenteringsmotoren. */
  yeastPercent: number;
  yeastType: YeastType;
}

/** Samlet dejvægt = antal pizzaer x vægt pr. dejbold. */
export function calculateTotalDoughWeight(pizzaCount: number, ballWeightG: number): number {
  return pizzaCount * ballWeightG;
}

/**
 * Omregner en gærprocent udtrykt i IDY til den valgte gærtype.
 * Instant tørgær og aktiv tørgær er ikke samme produkt; derfor findes
 * omregningen som en eksplicit tabel frem for at blive antaget væk.
 */
export function convertYeastPercent(idyPercent: number, yeastType: YeastType): number {
  return idyPercent * YEAST_FACTORS[yeastType];
}

/** Beregner mel, vand, salt og gær ud fra den samlede ønskede dejvægt. */
export function calculateIngredients(args: IngredientArgs): Ingredients {
  const { pizzaCount, ballWeightG, hydration, salt, yeastType } = args;
  const yeastPercent = convertYeastPercent(args.yeastPercent, yeastType);

  const totalDoughG = calculateTotalDoughWeight(pizzaCount, ballWeightG);
  const flourG = totalDoughG / (1 + hydration + salt + yeastPercent);

  return {
    totalDoughG,
    flourG,
    waterG: flourG * hydration,
    saltG: flourG * salt,
    yeastG: flourG * yeastPercent,
    yeastPercent,
    yeastType,
  };
}
