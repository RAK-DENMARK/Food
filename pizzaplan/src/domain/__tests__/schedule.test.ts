import { describe, expect, it } from 'vitest';
import { PROCESS } from '../../config/dough';
import { selectFermentationStrategy } from '../fermentation';
import { createDoughSchedule } from '../schedule';
import { hoursBetween } from '../../utils/time';

function scheduleFor(availableHours: number, servingTime: Date, roomTempC = 22) {
  const fermentation = selectFermentationStrategy(availableHours, roomTempC);
  if (!fermentation) throw new Error('forventede en plan');
  return {
    fermentation,
    steps: createDoughSchedule({ fermentation, servingTime, pizzaCount: 6, ballWeightG: 270 }),
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
    const fermentation = selectFermentationStrategy(24, 22)!;
    const steps = createDoughSchedule({
      fermentation,
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

  it('markerer de trin, der egner sig til en påmindelse', () => {
    const serving = new Date(2026, 8, 12, 18, 0);
    const { steps } = scheduleFor(40, serving);
    const notifiable = steps.filter((step) => step.notifiable).map((step) => step.id);
    expect(notifiable).toContain('mix');
    expect(notifiable).toContain('ball');
    expect(notifiable).toContain('fridge-out');
  });
});
