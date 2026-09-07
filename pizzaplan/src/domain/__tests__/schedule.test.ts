import { describe, expect, it } from 'vitest';
import { PREFERMENTS, PROCESS } from '../../config/dough';
import { selectFermentationStrategy } from '../fermentation';
import { calculateIngredients } from '../ingredients';
import { createDoughSchedule } from '../schedule';
import { hoursBetween } from '../../utils/time';
import type { DoughMethod, FermentationPlan } from '../../types';

/** Bygger de ingredienser, tidsplanen skal bruge for at kunne skrive mængder. */
function ingredientsFor(fermentation: FermentationPlan) {
  const preferment = fermentation.preferment;
  return calculateIngredients({
    pizzaCount: 6,
    ballWeightG: 270,
    hydration: 0.62,
    salt: 0.03,
    yeastPercent: 0.001,
    yeastType: 'IDY',
    preferment: preferment
      ? {
          kind: preferment.kind,
          flourShare: PREFERMENTS[preferment.kind].flourShare,
          hydration: PREFERMENTS[preferment.kind].hydration,
          yeastPercent: 0.0015,
          hours: preferment.hours,
        }
      : undefined,
  });
}

function scheduleFor(
  availableHours: number,
  servingTime: Date,
  roomTempC = 22,
  method: DoughMethod = 'direct',
) {
  const result = selectFermentationStrategy({ availableHours, roomTempC, method, route: 'auto' });
  if (!result.ok) throw new Error(`forventede en plan: ${result.issue.message}`);
  const fermentation = result.plan;
  const ingredients = ingredientsFor(fermentation);
  return {
    fermentation,
    ingredients,
    steps: createDoughSchedule({
      fermentation,
      ingredients,
      servingTime,
      pizzaCount: 6,
      ballWeightG: 270,
    }),
  };
}

describe('createDoughSchedule', () => {
  it('slutter præcis på serveringstidspunktet', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving);
    const bake = steps[steps.length - 1];
    expect(bake.id).toBe('bake');
    expect(bake.time.getTime()).toBe(serving.getTime());
  });

  it('er kronologisk sorteret', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    for (const hours of [3, 6, 12, 24, 48]) {
      const { steps } = scheduleFor(hours, serving);
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i].time.getTime()).toBeGreaterThanOrEqual(steps[i - 1].time.getTime());
      }
    }
  });

  it('starter præcis den samlede varighed før servering', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { fermentation, steps } = scheduleFor(30, serving);
    const start = steps[0];
    expect(start.id).toBe('mix');
    expect(hoursBetween(start.time, serving)).toBeCloseTo(fermentation.totalHours, 6);
  });

  it('har køletrin når strategien bruger køleskab', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving);
    const ids = steps.map((step) => step.id);
    expect(ids).toEqual(['mix', 'mixed', 'ball', 'fridge-in', 'fridge-out', 'bake']);
  });

  it('springer køletrin over ved korte planer', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(6, serving);
    expect(steps.map((step) => step.id)).toEqual(['mix', 'mixed', 'ball', 'bake']);
  });

  it('lægger dejbollerne på køl kort efter de er formet', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving);
    const ball = steps.find((step) => step.id === 'ball')!;
    const fridgeIn = steps.find((step) => step.id === 'fridge-in')!;
    expect(hoursBetween(ball.time, fridgeIn.time)).toBeCloseTo(PROCESS.chillLagHours, 6);
  });

  it('nævner antal dejbolde og vægt i instruktionen', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const result = selectFermentationStrategy({
      availableHours: 24,
      roomTempC: 22,
      method: 'direct',
      route: 'auto',
    });
    if (!result.ok) throw new Error('forventede en plan');
    const fermentation = result.plan;
    const steps = createDoughSchedule({
      fermentation,
      ingredients: ingredientsFor(fermentation),
      servingTime: serving,
      pizzaCount: 8,
      ballWeightG: 250,
    });
    const ball = steps.find((step) => step.id === 'ball')!;
    expect(ball.detail).toContain('8 portioner');
    expect(ball.detail).toContain('250 g');
  });

  it('håndterer en plan hen over midnat', () => {
    // Servering kl. 12 med 8 timers plan starter dagen før om aftenen.
    const serving = new Date(2026, 8, 12, 4, 0);
    const { steps } = scheduleFor(8, serving);
    const start = steps[0];
    expect(start.time.getDate()).toBe(11);
    expect(start.time.getHours()).toBeGreaterThanOrEqual(19);
    expect(steps[steps.length - 1].time.getDate()).toBe(12);
  });

  it('håndterer en plan over flere dage', () => {
    const serving = new Date(2026, 8, 13, 18, 0);
    const { steps } = scheduleFor(48, serving);
    const start = steps[0];
    expect(start.time.getDate()).toBe(11);
    // Planen spænder over mere end et døgn: start fredag, bagning søndag.
    expect(steps[steps.length - 1].time.getDate()).toBe(13);
    expect(hoursBetween(start.time, serving)).toBeGreaterThan(24);
  });

  it('bevarer lokal vægurstid hen over overgangen til vintertid', () => {
    // Sommertid slutter i Danmark natten til søndag den 25. oktober 2026.
    const serving = new Date(2026, 9, 25, 18, 0);
    const { fermentation, steps } = scheduleFor(30, serving);
    const start = steps[0];
    // Forløbet tid er den samme uanset urskiftet.
    expect(hoursBetween(start.time, serving)).toBeCloseTo(fermentation.totalHours, 6);
    expect(steps[steps.length - 1].time.getHours()).toBe(18);
  });

  it('sætter fordejen først og nævner dens mængder', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps, ingredients } = scheduleFor(30, serving, 22, 'poolish');
    expect(steps[0].id).toBe('preferment');
    expect(steps[0].title).toContain('poolish');
    expect(steps[0].detail).toContain(`${Math.round(ingredients.preferment!.flourG)} g mel`);
  });

  it('starter fordejen præcis modningstiden før æltningen', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps, fermentation } = scheduleFor(30, serving, 22, 'poolish');
    const preferment = steps.find((step) => step.id === 'preferment')!;
    const mix = steps.find((step) => step.id === 'mix')!;
    expect(hoursBetween(preferment.time, mix.time)).toBeCloseTo(fermentation.preferment!.hours, 6);
  });

  it('beder brugeren blande fordejen i ved æltningen', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving, 22, 'biga');
    const mix = steps.find((step) => step.id === 'mix')!;
    expect(mix.detail).toContain('bigaen');
  });

  it('skriver mængderne i æltetrinnet for en direkte dej', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps, ingredients } = scheduleFor(24, serving);
    const mix = steps.find((step) => step.id === 'mix')!;
    expect(mix.detail).toContain(`${Math.round(ingredients.finalDough.flourG)} g mel`);
    expect(mix.detail).toContain('salt');
  });

  it('markerer de trin, der egner sig til en påmindelse', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving);
    const notifiable = steps.filter((step) => step.notifiable).map((step) => step.id);
    expect(notifiable).toContain('mix');
    expect(notifiable).toContain('ball');
    expect(notifiable).toContain('fridge-out');
  });
});
