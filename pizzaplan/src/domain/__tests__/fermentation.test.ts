import { describe, expect, it } from 'vitest';
import { FERMENTATION, MODEL_TEMP_RANGE_C, PREFERMENTS, PROCESS, ROOM_MAX_TOTAL_HOURS } from '../../config/dough';
import {
  calculateYeastPercent,
  equivalentHoursAt20,
  prefermentHours,
  roomRateFactor,
  selectFermentationStrategy,
  temperHours,
  type StrategyRequest,
} from '../fermentation';
import type { FermentationPlan } from '../../types';

function request(overrides: Partial<StrategyRequest> = {}): StrategyRequest {
  return {
    availableHours: 30,
    roomTempC: 22,
    method: 'direct',
    route: 'auto',
    ...overrides,
  };
}

/** Hjælper til de tests, hvor planen forventes at lykkes. */
function planFor(overrides: Partial<StrategyRequest> = {}): FermentationPlan {
  const result = selectFermentationStrategy(request(overrides));
  if (!result.ok) throw new Error(`forventede en plan: ${result.issue.message}`);
  return result.plan;
}

describe('roomRateFactor', () => {
  it('er 1,0 ved referencetemperaturen 20 °C', () => {
    expect(roomRateFactor(20)).toBeCloseTo(1, 12);
  });

  it('fordobler hastigheden pr. 10 °C', () => {
    expect(roomRateFactor(30)).toBeCloseTo(2, 12);
    expect(roomRateFactor(30) / roomRateFactor(20)).toBeCloseTo(2, 12);
  });

  it('klamper temperaturer uden for modellens interval', () => {
    expect(roomRateFactor(5)).toBeCloseTo(roomRateFactor(MODEL_TEMP_RANGE_C.min), 12);
    expect(roomRateFactor(40)).toBeCloseTo(roomRateFactor(MODEL_TEMP_RANGE_C.max), 12);
  });

  it('er monotont stigende med temperaturen', () => {
    for (let t = 12; t < 32; t += 1) {
      expect(roomRateFactor(t + 1)).toBeGreaterThan(roomRateFactor(t));
    }
  });
});

describe('temperHours', () => {
  it('er 4 timer ved 20 °C', () => {
    expect(temperHours(20)).toBe(4);
  });

  it('er kortere i et varmt køkken og længere i et koldt', () => {
    expect(temperHours(26)).toBeLessThan(temperHours(20));
    expect(temperHours(15)).toBeGreaterThan(temperHours(20));
  });

  it('holder sig inden for grænserne', () => {
    expect(temperHours(40)).toBeGreaterThanOrEqual(FERMENTATION.temperMinHours);
    expect(temperHours(5)).toBeLessThanOrEqual(FERMENTATION.temperMaxHours);
  });
});

describe('prefermentHours', () => {
  it('modner en poolish på cirka 12 timer ved 20 °C', () => {
    expect(prefermentHours('poolish', 20)).toBe(12);
  });

  it('modner en biga på cirka 16 timer ved 18 °C', () => {
    expect(prefermentHours('biga', 18)).toBeGreaterThanOrEqual(15.5);
    expect(prefermentHours('biga', 18)).toBeLessThanOrEqual(16.5);
  });

  it('går hurtigere i et varmt køkken', () => {
    expect(prefermentHours('poolish', 26)).toBeLessThan(prefermentHours('poolish', 20));
  });

  it('holder sig inden for fordejens grænser', () => {
    expect(prefermentHours('poolish', 35)).toBeGreaterThanOrEqual(PREFERMENTS.poolish.minHours);
    expect(prefermentHours('biga', 5)).toBeLessThanOrEqual(PREFERMENTS.biga.maxHours);
  });
});

describe('selectFermentationStrategy – direkte dej', () => {
  it('afviser planer under minimumstiden', () => {
    const result = selectFermentationStrategy(request({ availableHours: 1 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('too-little-time');
  });

  it('vælger stuetemperatur uden køl ved kort tid', () => {
    const plan = planFor({ availableHours: 5 });
    expect(plan.usesFridge).toBe(false);
    expect(plan.strategy).toBe('direct-room');
    expect(plan.method).toBe('direct');
  });

  it('vælger køleskab når der er god tid', () => {
    const plan = planFor({ availableHours: 40 });
    expect(plan.usesFridge).toBe(true);
    expect(plan.strategy).toBe('direct-cold');
    expect(plan.route).toBe('cold');
  });

  it('planlægger aldrig længere end det aftalte maksimum', () => {
    expect(planFor({ availableHours: 200 }).totalHours).toBe(FERMENTATION.preferredMaxTotalHours);
  });

  it('bruger ikke køl til mellemlange planer', () => {
    const plan = planFor({ availableHours: 14 });
    expect(plan.usesFridge).toBe(false);
  });

  it('lader faserne summe til den samlede varighed', () => {
    for (const hours of [3, 6, 9, 12, 18, 24, 30, 48, 72]) {
      const plan = planFor({ availableHours: hours });
      const phaseSum = plan.phases.reduce((sum, phase) => sum + phase.hours, 0);
      const lag = plan.usesFridge ? PROCESS.chillLagHours : 0;
      expect(phaseSum + plan.mixHours + lag).toBeCloseTo(plan.totalHours, 9);
    }
  });

  it('giver et køleskabsophold, der er langt nok til at give mening', () => {
    const plan = planFor({ availableHours: 24 });
    const fridgeHours = plan.phases
      .filter((phase) => phase.kind === 'fridge' || phase.kind === 'fridge-cooldown')
      .reduce((sum, phase) => sum + phase.hours, 0);
    expect(fridgeHours).toBeGreaterThanOrEqual(FERMENTATION.minFridgeHours);
  });

  it('regner ækvivalente timer varmere op i et varmt køkken', () => {
    const cold = planFor({ availableHours: 8, roomTempC: 16 });
    const warm = planFor({ availableHours: 8, roomTempC: 28 });
    expect(warm.equivalentHoursAt20).toBeGreaterThan(cold.equivalentHoursAt20);
  });
});

describe('selectFermentationStrategy – valg af forløb', () => {
  it('holder et stuetemperaturforløb på højst 24 timer', () => {
    const plan = planFor({ availableHours: 72, route: 'room' });
    expect(plan.usesFridge).toBe(false);
    expect(plan.totalHours).toBe(ROOM_MAX_TOTAL_HOURS);
  });

  it('respekterer et ønske om stuetemperatur, selv når der er tid til køl', () => {
    const plan = planFor({ availableHours: 40, route: 'room' });
    expect(plan.route).toBe('room');
    expect(plan.phases.some((phase) => phase.kind === 'fridge')).toBe(false);
  });

  it('respekterer et ønske om køl', () => {
    const plan = planFor({ availableHours: 26, route: 'cold' });
    expect(plan.route).toBe('cold');
  });

  it('afviser køl, når der ikke er tid nok til det', () => {
    const result = selectFermentationStrategy(request({ availableHours: 8, route: 'cold' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('route-needs-more-time');
  });

  it('falder tilbage til stuetemperatur i automatisk tilstand', () => {
    expect(planFor({ availableHours: 8, route: 'auto' }).route).toBe('room');
  });
});

describe('selectFermentationStrategy – fordeje', () => {
  it('afviser en poolish, når der er for kort tid', () => {
    const result = selectFermentationStrategy(request({ availableHours: 10, method: 'poolish' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('method-needs-more-time');
    expect(result.issue.message).toContain('direkte');
  });

  it('afviser en biga, når der er for kort tid', () => {
    const result = selectFermentationStrategy(request({ availableHours: 18, method: 'biga' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('method-needs-more-time');
  });

  it('lægger fordejen først i forløbet', () => {
    const plan = planFor({ availableHours: 24, method: 'poolish' });
    expect(plan.phases[0].kind).toBe('preferment');
    expect(plan.preferment?.kind).toBe('poolish');
  });

  it('tæller ikke fordejen med i hovedfermenteringens ækvivalente timer', () => {
    const plan = planFor({ availableHours: 24, method: 'poolish' });
    const mainPhases = plan.phases.filter((phase) => phase.kind !== 'preferment');
    expect(plan.equivalentHoursAt20).toBeCloseTo(equivalentHoursAt20(mainPhases), 9);
    expect(plan.preferment?.equivalentHoursAt20).toBeGreaterThan(0);
  });

  it('lader fordej plus hovedforløb summe til den samlede varighed', () => {
    for (const method of ['poolish', 'biga'] as const) {
      const plan = planFor({ availableHours: 40, method });
      const phaseSum = plan.phases.reduce((sum, phase) => sum + phase.hours, 0);
      const lag = plan.usesFridge ? PROCESS.chillLagHours : 0;
      expect(phaseSum + plan.mixHours + lag).toBeCloseTo(plan.totalHours, 9);
    }
  });

  it('lader fordejen spise af loftet i stedet for at lægge sig oven på det', () => {
    const plan = planFor({ availableHours: 90, method: 'poolish', route: 'cold' });
    expect(plan.totalHours).toBeLessThanOrEqual(FERMENTATION.preferredMaxTotalHours);
    expect(plan.totalHours).toBeCloseTo(FERMENTATION.preferredMaxTotalHours, 6);
  });

  it('holder en poolish ved stuetemperatur inden for 24 timer i alt', () => {
    const plan = planFor({ availableHours: 40, method: 'poolish', route: 'room' });
    expect(plan.totalHours).toBeLessThanOrEqual(ROOM_MAX_TOTAL_HOURS);
    const prefHours = plan.preferment!.hours;
    const mainHours = plan.totalHours - prefHours;
    expect(mainHours).toBeGreaterThan(0);
  });

  it('kan kombinere fordej med køl, når der er tid nok', () => {
    const plan = planFor({ availableHours: 48, method: 'biga', route: 'cold' });
    expect(plan.strategy).toBe('biga-cold');
    expect(plan.usesFridge).toBe(true);
    expect(plan.preferment?.kind).toBe('biga');
  });

  it('kan lave en poolish, der hæver færdig ved stuetemperatur', () => {
    const plan = planFor({ availableHours: 24, method: 'poolish', route: 'room' });
    expect(plan.strategy).toBe('poolish-room');
    expect(plan.usesFridge).toBe(false);
  });
});

describe('equivalentHoursAt20', () => {
  it('vægter timer med fasens hastighed', () => {
    const hours = equivalentHoursAt20([
      { kind: 'bulk-room', hours: 2, tempC: 20, rate: 1 },
      { kind: 'fridge', hours: 10, tempC: 5, rate: 0.12 },
    ]);
    expect(hours).toBeCloseTo(3.2, 9);
  });
});

describe('calculateYeastPercent', () => {
  it('rammer ankerpunkterne', () => {
    expect(calculateYeastPercent(4)).toBeCloseTo(0.0045, 6);
    expect(calculateYeastPercent(24)).toBeCloseTo(0.00085, 6);
  });

  it('falder monotont med længere fermentering', () => {
    let previous = Infinity;
    for (let hours = 1; hours <= 80; hours += 1) {
      const percent = calculateYeastPercent(hours);
      expect(percent).toBeLessThanOrEqual(previous);
      previous = percent;
    }
  });

  it('interpolerer mellem ankerpunkterne', () => {
    const value = calculateYeastPercent(16);
    expect(value).toBeLessThan(calculateYeastPercent(12));
    expect(value).toBeGreaterThan(calculateYeastPercent(18));
  });

  it('holder sig inden for fornuftige grænser', () => {
    expect(calculateYeastPercent(0.1)).toBeLessThanOrEqual(0.01);
    expect(calculateYeastPercent(500)).toBeGreaterThan(0);
  });

  it('giver cirka halv gærmængde ved dobbelt så lang tid', () => {
    const ratio = calculateYeastPercent(12) / calculateYeastPercent(24);
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });
});
