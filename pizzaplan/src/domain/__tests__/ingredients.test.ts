import { describe, expect, it } from 'vitest';
import { DEFAULT_HYDRATION, DEFAULT_SALT } from '../../config/dough';
import { PREFERMENTS } from '../../config/dough';
import {
  calculateIngredients,
  calculateTotalDoughWeight,
  limitPrefermentShare,
} from '../ingredients';

const base = {
  pizzaCount: 6,
  ballWeightG: 270,
  hydration: DEFAULT_HYDRATION,
  salt: DEFAULT_SALT,
  yeastPercent: 0.0012,
  yeastType: 'IDY' as const,
};

describe('calculateTotalDoughWeight', () => {
  it('ganger antal pizzaer med dejboldvægten', () => {
    expect(calculateTotalDoughWeight(6, 270)).toBe(1620);
    expect(calculateTotalDoughWeight(1, 250)).toBe(250);
  });
});

describe('calculateIngredients', () => {
  it('rammer den samlede dejvægt præcist', () => {
    const ing = calculateIngredients(base);
    expect(ing.totalDoughG).toBe(1620);
    expect(ing.flourG + ing.waterG + ing.saltG + ing.yeastG).toBeCloseTo(1620, 9);
  });

  it('bruger hydreringen som andel af melet', () => {
    const ing = calculateIngredients(base);
    expect(ing.waterG / ing.flourG).toBeCloseTo(DEFAULT_HYDRATION, 12);
  });

  it('bruger saltprocenten som andel af melet', () => {
    const ing = calculateIngredients(base);
    expect(ing.saltG / ing.flourG).toBeCloseTo(DEFAULT_SALT, 12);
  });

  it('bruger gærprocenten som andel af melet', () => {
    const ing = calculateIngredients(base);
    expect(ing.yeastG / ing.flourG).toBeCloseTo(0.0012, 12);
  });

  it('giver forventede mængder for standardopskriften', () => {
    const ing = calculateIngredients(base);
    // 1620 / (1 + 0,62 + 0,03 + 0,0012) = 981,10 g mel
    expect(ing.flourG).toBeCloseTo(981.1, 1);
    expect(ing.waterG).toBeCloseTo(608.28, 1);
    expect(ing.saltG).toBeCloseTo(29.43, 1);
    expect(ing.yeastG).toBeCloseTo(1.18, 2);
  });

  it('skalerer lineært med antal pizzaer', () => {
    const six = calculateIngredients(base);
    const twelve = calculateIngredients({ ...base, pizzaCount: 12 });
    expect(twelve.flourG).toBeCloseTo(six.flourG * 2, 9);
    expect(twelve.waterG).toBeCloseTo(six.waterG * 2, 9);
  });

  it('regner med fuld præcision uden at afrunde', () => {
    const ing = calculateIngredients({ ...base, pizzaCount: 7, ballWeightG: 265 });
    expect(Number.isInteger(ing.flourG)).toBe(false);
  });

  it('lægger alt i den endelige dej, når der ikke er fordej', () => {
    const ing = calculateIngredients(base);
    expect(ing.preferment).toBeUndefined();
    expect(ing.finalDough.flourG).toBeCloseTo(ing.flourG, 9);
    expect(ing.finalDough.waterG).toBeCloseTo(ing.waterG, 9);
    expect(ing.finalDough.saltG).toBeCloseTo(ing.saltG, 9);
  });

  it('håndterer høj hydrering', () => {
    const ing = calculateIngredients({ ...base, hydration: 0.8 });
    expect(ing.waterG / ing.flourG).toBeCloseTo(0.8, 12);
    expect(ing.flourG + ing.waterG + ing.saltG + ing.yeastG).toBeCloseTo(1620, 9);
  });
});


describe('fordeje', () => {
  const poolish = {
    kind: 'poolish' as const,
    flourShare: PREFERMENTS.poolish.flourShare,
    hydration: PREFERMENTS.poolish.hydration,
    yeastPercent: 0.0017,
    hours: 12,
  };

  it('deler mel og vand mellem fordejen og den endelige dej', () => {
    const ing = calculateIngredients({ ...base, preferment: poolish });
    expect(ing.preferment).toBeDefined();
    expect(ing.preferment!.flourG + ing.finalDough.flourG).toBeCloseTo(ing.flourG, 9);
    expect(ing.preferment!.waterG + ing.finalDough.waterG).toBeCloseTo(ing.waterG, 9);
    expect(ing.preferment!.yeastG + ing.finalDough.yeastG).toBeCloseTo(ing.yeastG, 9);
  });

  it('rammer stadig den samlede dejvægt', () => {
    const ing = calculateIngredients({ ...base, preferment: poolish });
    expect(ing.flourG + ing.waterG + ing.saltG + ing.yeastG).toBeCloseTo(1620, 9);
  });

  it('giver poolishen lige dele mel og vand', () => {
    const ing = calculateIngredients({ ...base, preferment: poolish });
    expect(ing.preferment!.waterG).toBeCloseTo(ing.preferment!.flourG, 9);
  });

  it('holder alt saltet i den endelige dej', () => {
    const ing = calculateIngredients({ ...base, preferment: poolish });
    expect(ing.finalDough.saltG).toBeCloseTo(ing.saltG, 9);
  });

  it('laver en tør biga', () => {
    const ing = calculateIngredients({
      ...base,
      preferment: {
        kind: 'biga',
        flourShare: PREFERMENTS.biga.flourShare,
        hydration: PREFERMENTS.biga.hydration,
        yeastPercent: 0.0012,
        hours: 16,
      },
    });
    expect(ing.preferment!.waterG / ing.preferment!.flourG).toBeCloseTo(0.45, 9);
    expect(ing.finalDough.waterG).toBeGreaterThan(0);
  });

  it('skruer fordejens andel ned, hvis den endelige dej ellers bliver knastør', () => {
    const share = limitPrefermentShare(0.3, 1.0, 0.5);
    expect(share).toBeLessThan(0.3);

    const ing = calculateIngredients({ ...base, hydration: 0.5, preferment: poolish });
    const finalHydration = ing.finalDough.waterG / ing.finalDough.flourG;
    expect(finalHydration).toBeGreaterThanOrEqual(0.39);
  });

  it('rører ikke andelen, når der er vand nok', () => {
    expect(limitPrefermentShare(0.3, 1.0, 0.62)).toBeCloseTo(0.3, 9);
    expect(limitPrefermentShare(0.4, 0.45, 0.62)).toBeCloseTo(0.4, 9);
  });
});
