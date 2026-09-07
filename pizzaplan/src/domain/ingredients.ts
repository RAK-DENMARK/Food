/**
 * Ingrediensberegning efter bagerprocent.
 *
 *   Samlet dejvægt = M x (1 + H + S + Y)
 *   =>  M = samlet dejvægt / (1 + H + S + Y)
 *
 * hvor M = mel, H = hydrering, S = saltprocent, Y = gærprocent
 * (alle som decimaler af den SAMLEDE melvægt).
 *
 * Ved en indirekte metode deles mel, vand og gær mellem fordejen og den
 * endelige dej. Saltet kommer altid i den endelige dej – salt i en fordej
 * ville bremse modningen.
 *
 * Der regnes med fuld flydende præcision. Afrunding hører til i visningen
 * (se src/utils/format.ts).
 */

import { MIN_FINAL_DOUGH_HYDRATION, YEAST_FACTORS } from '../config/dough';
import type { Ingredients, PrefermentKind, YeastType } from '../types';

export interface PrefermentSpec {
  kind: PrefermentKind;
  /** Andel af den samlede melmængde. */
  flourShare: number;
  /** Fordejens egen hydrering. */
  hydration: number;
  /** Gær i fordejen som andel af FORDEJENS mel. */
  yeastPercent: number;
  hours: number;
}

export interface IngredientArgs {
  pizzaCount: number;
  ballWeightG: number;
  hydration: number;
  salt: number;
  /** Gær i den endelige dej som andel af den SAMLEDE melvægt. */
  yeastPercent: number;
  yeastType: YeastType;
  preferment?: PrefermentSpec;
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

/**
 * Begrænser fordejens andel, så der er vand nok tilbage til den endelige dej.
 *
 * En poolish på 100 % hydrering kan tage så meget af vandet, at resten af dejen
 * bliver knastør. Sker det, skrues fordejens andel ned i stedet for at lave en
 * opskrift, der ikke kan æltes.
 */
export function limitPrefermentShare(
  share: number,
  prefermentHydration: number,
  doughHydration: number,
): number {
  if (prefermentHydration <= MIN_FINAL_DOUGH_HYDRATION) return share;
  const maxShare =
    (doughHydration - MIN_FINAL_DOUGH_HYDRATION) / (prefermentHydration - MIN_FINAL_DOUGH_HYDRATION);
  return Math.max(0, Math.min(share, maxShare));
}

/** Beregner mel, vand, salt og gær ud fra den samlede ønskede dejvægt. */
export function calculateIngredients(args: IngredientArgs): Ingredients {
  const { pizzaCount, ballWeightG, hydration, salt, yeastType, preferment } = args;

  const finalYeastPercent = convertYeastPercent(args.yeastPercent, yeastType);
  const share = preferment
    ? limitPrefermentShare(preferment.flourShare, preferment.hydration, hydration)
    : 0;
  const prefermentYeastPercent = preferment
    ? convertYeastPercent(preferment.yeastPercent, yeastType)
    : 0;

  // Gær i alt, målt som andel af den samlede melvægt.
  const totalYeastPercent = finalYeastPercent + share * prefermentYeastPercent;

  const totalDoughG = calculateTotalDoughWeight(pizzaCount, ballWeightG);
  const flourG = totalDoughG / (1 + hydration + salt + totalYeastPercent);
  const waterG = flourG * hydration;
  const saltG = flourG * salt;
  const yeastG = flourG * totalYeastPercent;

  if (!preferment || share <= 0) {
    return {
      totalDoughG,
      flourG,
      waterG,
      saltG,
      yeastG,
      yeastPercent: totalYeastPercent,
      yeastType,
      finalDough: { flourG, waterG, saltG, yeastG },
    };
  }

  const prefermentFlourG = flourG * share;
  const prefermentWaterG = prefermentFlourG * preferment.hydration;
  const prefermentYeastG = prefermentFlourG * prefermentYeastPercent;

  return {
    totalDoughG,
    flourG,
    waterG,
    saltG,
    yeastG,
    yeastPercent: totalYeastPercent,
    yeastType,
    preferment: {
      kind: preferment.kind,
      flourG: prefermentFlourG,
      waterG: prefermentWaterG,
      yeastG: prefermentYeastG,
      hydration: preferment.hydration,
      flourShare: share,
      hours: preferment.hours,
    },
    finalDough: {
      flourG: flourG - prefermentFlourG,
      waterG: waterG - prefermentWaterG,
      saltG,
      yeastG: yeastG - prefermentYeastG,
    },
  };
}
