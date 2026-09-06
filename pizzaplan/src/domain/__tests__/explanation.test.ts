import { describe, expect, it } from 'vitest';
import { DEFAULT_HYDRATION, DEFAULT_SALT } from '../../config/dough';
import { createDoughPlan } from '../plan';
import { explainPlan } from '../explanation';
import { plannedNotifications } from '../../notifications/plannedNotifications';
import type { DoughInput } from '../../types';
import { addHours } from '../../utils/time';

const now = new Date(2026, 8, 10, 20, 0);

function input(overrides: Partial<DoughInput> = {}): DoughInput {
  return {
    pizzaCount: 6,
    ballWeightG: 270,
    hydration: DEFAULT_HYDRATION,
    salt: DEFAULT_SALT,
    yeastType: 'IDY',
    roomTempC: 22,
    servingTime: addHours(now, 40),
    ...overrides,
  };
}

function planFor(overrides: Partial<DoughInput> = {}) {
  const result = createDoughPlan(input(overrides), now);
  if (!result.ok) throw new Error('forventede en plan');
  return result.plan;
}

describe('explainPlan', () => {
  it('forklarer koldhævning og nævner køleskabet', () => {
    const lines = explainPlan(planFor());
    expect(lines.join(' ')).toContain('køl');
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });

  it('siger altid, at rumtemperatur kun er et pejlemærke', () => {
    const lines = explainPlan(planFor({ servingTime: addHours(now, 6) }));
    expect(lines.join(' ')).toContain('rumtemperaturen som pejlemærke');
  });

  it('nævner ekstra usikkerhed uden for modellens temperaturinterval', () => {
    const lines = explainPlan(planFor({ roomTempC: 9 }));
    expect(lines.join(' ')).toContain('usikker');
  });

  it('nævner ikke køleskab i en plan uden køl', () => {
    const lines = explainPlan(planFor({ servingTime: addHours(now, 6) }));
    expect(lines.join(' ')).not.toContain('Køleskabet regnes');
  });
});

describe('plannedNotifications', () => {
  it('laver påmindelser til de vigtige trin', () => {
    const notifications = plannedNotifications(planFor(), now);
    const titles = notifications.map((notification) => notification.title);
    expect(titles).toContain('Tid til at lave pizzadejen');
    expect(titles).toContain('Tag dejen ud af køleskabet');
  });

  it('springer trin i fortiden over', () => {
    const plan = planFor();
    const afterStart = addHours(plan.schedule[0].time, 1);
    const notifications = plannedNotifications(plan, afterStart);
    expect(notifications.every((notification) => notification.time > afterStart)).toBe(true);
  });

  it('giver hvert trin sit eget id', () => {
    const notifications = plannedNotifications(planFor(), now);
    const ids = new Set(notifications.map((notification) => notification.id));
    expect(ids.size).toBe(notifications.length);
  });
});
