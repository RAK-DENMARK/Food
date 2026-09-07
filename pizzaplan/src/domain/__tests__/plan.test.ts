import { describe, expect, it } from 'vitest';
import { DEFAULT_HYDRATION, DEFAULT_SALT, PRECISION_SCALE_YEAST_G } from '../../config/dough';
import type { DoughInput } from '../../types';
import { createDoughPlan, tinyYeastAdvice } from '../plan';
import { addHours, hoursBetween } from '../../utils/time';
import { formatYeast } from '../../utils/format';

const now = new Date(2026, 8, 10, 20, 0);

function input(overrides: Partial<DoughInput> = {}): DoughInput {
  return {
    pizzaCount: 6,
    ballWeightG: 270,
    hydration: DEFAULT_HYDRATION,
    salt: DEFAULT_SALT,
    yeastType: 'IDY',
    roomTempC: 22,
    method: 'direct',
    route: 'auto',
    servingTime: new Date(2026, 8, 12, 18, 0),
    ...overrides,
  };
}

describe('createDoughPlan – hovedeksemplet', () => {
  // 6 pizzaer á 270 g, 62 % hydrering, 3 % salt, 22 °C, servering lørdag kl. 18.
  const result = createDoughPlan(input(), now);
  if (!result.ok) throw new Error('forventede en plan');
  const { plan } = result;

  it('rammer den samlede dejvægt', () => {
    expect(plan.ingredients.totalDoughG).toBe(1620);
  });

  it('giver mel, vand og salt i de rigtige forhold', () => {
    expect(plan.ingredients.flourG).toBeGreaterThan(970);
    expect(plan.ingredients.flourG).toBeLessThan(990);
    expect(plan.ingredients.waterG / plan.ingredients.flourG).toBeCloseTo(0.62, 9);
    expect(plan.ingredients.saltG / plan.ingredients.flourG).toBeCloseTo(0.03, 9);
  });

  it('giver en gærmængde, der kan måles og ikke er nul', () => {
    expect(plan.ingredients.yeastG).toBeGreaterThan(0);
    expect(formatYeast(plan.ingredients.yeastG)).not.toBe('0,00 g');
  });

  it('vælger koldhævning og klassificerer planen som optimal', () => {
    expect(plan.fermentation.strategy).toBe('direct-cold');
    expect(plan.fermentation.usesFridge).toBe(true);
    expect(plan.classification).toBe('optimal');
    expect(plan.classificationHeadline).toContain('god tid');
  });

  it('svarer på alle brugerens spørgsmål i tidsplanen', () => {
    const ids = plan.schedule.map((step) => step.id);
    expect(ids).toContain('mix');
    expect(ids).toContain('ball');
    expect(ids).toContain('fridge-in');
    expect(ids).toContain('fridge-out');
    expect(ids).toContain('bake');
  });

  it('bager præcis på serveringstidspunktet', () => {
    const bake = plan.schedule[plan.schedule.length - 1];
    expect(bake.time.getHours()).toBe(18);
    expect(bake.time.getDate()).toBe(12);
  });

  it('starter efter nu og før servering', () => {
    const start = plan.schedule[0];
    expect(start.time.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(start.time.getTime()).toBeLessThan(plan.input.servingTime.getTime());
  });
});

/**
 * Gærmængden er det tal, en dej står og falder med. Derfor er den låst fast
 * med tests mod kendte referencedeje frem for at være en fri konsekvens af
 * modellen.
 */
describe('createDoughPlan – gærmængder', () => {
  /** Gram instant tørgær pr. kg mel. */
  function gramsPerKilo(overrides: Partial<DoughInput>): number {
    const result = createDoughPlan(input(overrides), now);
    if (!result.ok) throw new Error(`forventede en plan: ${result.errors[0].message}`);
    const { ingredients } = result.plan;
    return ingredients.yeastG / (ingredients.flourG / 1000);
  }

  it('holder en direkte dej på et døgn eller mere under 0,4 g pr. kg mel', () => {
    for (const hours of [24, 26, 30, 36, 48, 72, 96]) {
      for (const temp of [12, 16, 18, 20, 22, 26, 30]) {
        for (const route of ['auto', 'room', 'cold'] as const) {
          const servingTime = addHours(now, hours);
          const result = createDoughPlan(
            input({ method: 'direct', route, roomTempC: temp, servingTime }),
            now,
          );
          if (!result.ok) continue;
          const { plan } = result;
          if (plan.fermentation.totalHours < 24) continue;
          const perKilo = plan.ingredients.yeastG / (plan.ingredients.flourG / 1000);
          expect(
            perKilo,
            `${hours} t ved ${temp} °C (${route}) gav ${perKilo.toFixed(2)} g/kg`,
          ).toBeLessThanOrEqual(0.4 + 1e-9);
        }
      }
    }
  });

  it('rammer den klassiske 24-timers dej ved stuetemperatur', () => {
    const perKilo = gramsPerKilo({ route: 'room', servingTime: addHours(now, 30) });
    expect(perKilo).toBeGreaterThan(0.2);
    expect(perKilo).toBeLessThan(0.4);
  });

  it('bruger cirka 1 g pr. kg mel til en dej på et halvt døgn', () => {
    const perKilo = gramsPerKilo({ servingTime: addHours(now, 12) });
    expect(perKilo).toBeGreaterThan(0.6);
    expect(perKilo).toBeLessThan(1.3);
  });

  it('bruger nogle få gram pr. kg mel til en hurtig dej samme dag', () => {
    const perKilo = gramsPerKilo({ servingTime: addHours(now, 5) });
    expect(perKilo).toBeGreaterThan(2);
    expect(perKilo).toBeLessThan(5);
  });

  it('bruger mindre gær, jo længere dejen hæver', () => {
    const short = gramsPerKilo({ servingTime: addHours(now, 6) });
    const medium = gramsPerKilo({ servingTime: addHours(now, 12) });
    const long = gramsPerKilo({ route: 'room', servingTime: addHours(now, 30) });
    expect(short).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(long);
  });

  it('foreslår fortynding, når gærmængden ikke kan vejes', () => {
    const result = createDoughPlan(input({ route: 'room', servingTime: addHours(now, 30) }), now);
    if (!result.ok) throw new Error('forventede en plan');
    const warning = result.plan.warnings.find((w) => w.code === 'tiny-yeast-amount');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('1 g gær ud i 100 ml');
  });

  it('regner fortyndingen om til hele milliliter', () => {
    expect(tinyYeastAdvice(0.27)).toContain('27 ml');
    expect(tinyYeastAdvice(0.4)).toContain('40 ml');
  });

  it('giver en poolish en gærmængde, der svarer til praksis', () => {
    const result = createDoughPlan(input({ method: 'poolish', route: 'room' }), now);
    if (!result.ok) throw new Error('forventede en plan');
    const preferment = result.plan.ingredients.preferment!;
    const percentOfPrefermentFlour = preferment.yeastG / preferment.flourG;
    // Praksis for en poolish: 0,1-0,3 % af fordejens eget mel.
    expect(percentOfPrefermentFlour).toBeGreaterThan(0.0008);
    expect(percentOfPrefermentFlour).toBeLessThan(0.003);
  });

  it('giver en biga mere gær end en poolish, fordi den er tør', () => {
    const poolish = createDoughPlan(input({ method: 'poolish', route: 'room' }), now);
    const biga = createDoughPlan(input({ method: 'biga', route: 'room' }), now);
    if (!poolish.ok || !biga.ok) throw new Error('forventede planer');
    const poolishPercent =
      poolish.plan.ingredients.preferment!.yeastG / poolish.plan.ingredients.preferment!.flourG;
    const bigaPercent =
      biga.plan.ingredients.preferment!.yeastG / biga.plan.ingredients.preferment!.flourG;
    expect(bigaPercent).toBeGreaterThan(poolishPercent);
  });

  it('lægger hovedparten af gæren i fordejen ved indirekte metoder', () => {
    const result = createDoughPlan(input({ method: 'biga', route: 'room' }), now);
    if (!result.ok) throw new Error('forventede en plan');
    const { preferment, finalDough } = result.plan.ingredients;
    expect(preferment!.yeastG).toBeGreaterThan(finalDough.yeastG);
  });
});

describe('createDoughPlan – varianter', () => {
  it('afviser servering i fortiden', () => {
    const result = createDoughPlan(input({ servingTime: addHours(now, -1) }), now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe('serving-in-past');
  });

  it('afviser servering om for kort tid', () => {
    const result = createDoughPlan(input({ servingTime: addHours(now, 2) }), now);
    expect(result.ok).toBe(false);
  });

  it('laver en hurtig plan uden køl ved kort varsel', () => {
    const result = createDoughPlan(input({ servingTime: addHours(now, 5) }), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.fermentation.usesFridge).toBe(false);
    expect(result.plan.classification).toBe('hurtig');
    expect(result.plan.classificationBody).toContain('mindre tid');
  });

  it('er ærlig ved meget kort varsel', () => {
    const result = createDoughPlan(input({ servingTime: addHours(now, 3.5) }), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.classification).toBe('meget-kort');
    expect(result.plan.classificationBody).toContain('ikke');
  });

  it('bruger mere gær jo kortere tid der er', () => {
    const quick = createDoughPlan(input({ servingTime: addHours(now, 6) }), now);
    const long = createDoughPlan(input({ servingTime: addHours(now, 40) }), now);
    if (!quick.ok || !long.ok) throw new Error('forventede planer');
    expect(quick.plan.ingredients.yeastPercent).toBeGreaterThan(long.plan.ingredients.yeastPercent);
  });

  it('bruger mindre gær i et varmt køkken end i et koldt', () => {
    const cold = createDoughPlan(input({ roomTempC: 16, servingTime: addHours(now, 10) }), now);
    const warm = createDoughPlan(input({ roomTempC: 28, servingTime: addHours(now, 10) }), now);
    if (!cold.ok || !warm.ok) throw new Error('forventede planer');
    expect(warm.plan.ingredients.yeastPercent).toBeLessThan(cold.plan.ingredients.yeastPercent);
  });

  it('advarer når gærmængden kræver en præcisionsvægt', () => {
    const result = createDoughPlan(input({ pizzaCount: 2, servingTime: addHours(now, 40) }), now);
    if (!result.ok) throw new Error('forventede en plan');
    if (result.plan.ingredients.yeastG < PRECISION_SCALE_YEAST_G) {
      expect(result.plan.warnings.map((w) => w.code)).toContain('tiny-yeast-amount');
    }
  });

  it('advarer om usikkerhed ved en kold stue', () => {
    const result = createDoughPlan(input({ roomTempC: 9 }), now);
    if (!result.ok) throw new Error('forventede en plan');
    expect(result.plan.warnings.map((w) => w.code)).toContain('temp-outside-model');
  });

  it('planlægger ikke længere end 48 timer selv med en uges varsel', () => {
    const result = createDoughPlan(input({ servingTime: addHours(now, 24 * 7) }), now);
    if (!result.ok) throw new Error('forventede en plan');
    expect(result.plan.fermentation.totalHours).toBe(48);
    expect(hoursBetween(now, result.plan.schedule[0].time)).toBeGreaterThan(100);
  });

  it('beskriver ikke en stuetemperaturplan som kold', () => {
    const result = createDoughPlan(input({ route: 'room', servingTime: addHours(now, 30) }), now);
    if (!result.ok) throw new Error('forventede en plan');
    expect(result.plan.classification).toBe('optimal');
    expect(result.plan.classificationBody).not.toContain('kold');
    expect(result.plan.classificationBody).toContain('stuetemperatur');
  });

  it('beskriver en koldhævet plan som kold', () => {
    const result = createDoughPlan(input({ route: 'cold', servingTime: addHours(now, 30) }), now);
    if (!result.ok) throw new Error('forventede en plan');
    expect(result.plan.classificationBody).toContain('kold');
  });

  it('laver en klassisk direkte dej ved stuetemperatur, når man beder om det', () => {
    const result = createDoughPlan(
      input({ route: 'room', servingTime: addHours(now, 30) }),
      now,
    );
    if (!result.ok) throw new Error('forventede en plan');
    expect(result.plan.fermentation.method).toBe('direct');
    expect(result.plan.fermentation.route).toBe('room');
    expect(result.plan.fermentation.totalHours).toBe(24);
    expect(result.plan.schedule.some((step) => step.id === 'fridge-in')).toBe(false);
  });

  it('laver en poolish med sin egen gær og sit eget trin', () => {
    const result = createDoughPlan(input({ method: 'poolish' }), now);
    if (!result.ok) throw new Error('forventede en plan');
    const { plan } = result;
    expect(plan.ingredients.preferment?.kind).toBe('poolish');
    expect(plan.ingredients.preferment!.yeastG).toBeGreaterThan(0);
    expect(plan.schedule[0].id).toBe('preferment');
    expect(plan.fermentation.strategy).toContain('poolish');
  });

  it('laver en biga som en tør fordej', () => {
    const result = createDoughPlan(input({ method: 'biga' }), now);
    if (!result.ok) throw new Error('forventede en plan');
    const preferment = result.plan.ingredients.preferment!;
    expect(preferment.kind).toBe('biga');
    expect(preferment.waterG / preferment.flourG).toBeCloseTo(0.45, 6);
  });

  it('bruger mindre gær i den endelige dej, når der er en fordej', () => {
    const direct = createDoughPlan(input({ method: 'direct', route: 'room' }), now);
    const poolish = createDoughPlan(input({ method: 'poolish', route: 'room' }), now);
    if (!direct.ok || !poolish.ok) throw new Error('forventede planer');
    expect(poolish.plan.ingredients.finalDough.yeastG).toBeLessThan(
      direct.plan.ingredients.finalDough.yeastG,
    );
  });

  it('afviser en poolish, når der er for kort tid, og siger hvad man kan gøre', () => {
    const result = createDoughPlan(
      input({ method: 'poolish', servingTime: addHours(now, 8) }),
      now,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe('method-needs-more-time');
    expect(result.errors[0].message).toContain('direkte');
  });

  it('afviser køl, når der ikke er tid nok', () => {
    const result = createDoughPlan(input({ route: 'cold', servingTime: addHours(now, 9) }), now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe('route-needs-more-time');
  });

  it('skalerer ingredienserne med antal pizzaer', () => {
    const four = createDoughPlan(input({ pizzaCount: 4 }), now);
    const eight = createDoughPlan(input({ pizzaCount: 8 }), now);
    if (!four.ok || !eight.ok) throw new Error('forventede planer');
    expect(eight.plan.ingredients.flourG).toBeCloseTo(four.plan.ingredients.flourG * 2, 6);
  });
});
