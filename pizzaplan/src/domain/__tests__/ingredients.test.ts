import { describe, expect, it } from 'vitest';
import { DEFAULT_HYDRATION, DEFAULT_SALT } from '../../config/dough';
import { calculateIngredients, calculateTotalDoughWeight } from '../ingredients';

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

  it('håndterer høj hydrering', () => {
    const ing = calculateIngredients({ ...base, hydration: 0.8 });
    expect(ing.waterG / ing.flourG).toBeCloseTo(0.8, 12);
    expect(ing.flourG + ing.waterG + ing.saltG + ing.yeastG).toBeCloseTo(1620, 9);
  });
});
