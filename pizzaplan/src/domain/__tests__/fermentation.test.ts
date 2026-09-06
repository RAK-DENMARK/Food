import { describe, expect, it } from 'vitest';
import { FERMENTATION, MODEL_TEMP_RANGE_C, PROCESS } from '../../config/dough';
import {
  calculateYeastPercent,
  equivalentHoursAt20,
  roomRateFactor,
  selectFermentationStrategy,
  temperHours,
} from '../fermentation';

describe('roomRateFactor', () => {
  it('er 1,0 ved referencetemperaturen 20 °C', () => {
    expect(roomRateFactor(20)).toBeCloseTo(1, 12);
  });

  it('fordobler hastigheden pr. 10 °C', () => {
    expect(roomRateFactor(30)).toBeCloseTo(2, 12);
    expect(roomRateFactor(20) / roomRateFactor(10 + MODEL_TEMP_RANGE_C.min - MODEL_TEMP_RANGE_C.min)).toBeGreaterThan(1);
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

describe('selectFermentationStrategy', () => {
  it('afviser planer under minimumstiden', () => {
    expect(selectFermentationStrategy(1, 22)).toBeNull();
    expect(selectFermentationStrategy(FERMENTATION.minTotalHours - 0.1, 22)).toBeNull();
  });

  it('vælger stuetemperatur uden køl ved kort tid', () => {
    const plan = selectFermentationStrategy(5, 22);
    expect(plan?.usesFridge).toBe(false);
    expect(plan?.strategy).toBe('same-day-room');
  });

  it('markerer meget korte planer', () => {
    const plan = selectFermentationStrategy(3, 22);
    expect(plan?.strategy).toBe('very-short-room');
  });

  it('vælger køleskab når der er god tid', () => {
    const plan = selectFermentationStrategy(40, 22);
    expect(plan?.usesFridge).toBe(true);
    expect(plan?.strategy).toBe('cold-ferment');
  });

  it('planlægger aldrig længere end det aftalte maksimum', () => {
    const plan = selectFermentationStrategy(200, 22);
    expect(plan?.totalHours).toBe(FERMENTATION.preferredMaxTotalHours);
  });

  it('lader faserne summe til den samlede varighed', () => {
    for (const hours of [3, 6, 9, 12, 18, 24, 30, 48, 72]) {
      const plan = selectFermentationStrategy(hours, 22);
      expect(plan).not.toBeNull();
      if (!plan) continue;
      const phaseSum = plan.phases.reduce((sum, phase) => sum + phase.hours, 0);
      const lag = plan.usesFridge ? PROCESS.chillLagHours : 0;
      expect(phaseSum + plan.mixHours + lag).toBeCloseTo(plan.totalHours, 9);
    }
  });

  it('giver et køleskabsophold, der er langt nok til at give mening', () => {
    const plan = selectFermentationStrategy(24, 22);
    const fridgeHours = (plan?.phases ?? [])
      .filter((phase) => phase.kind === 'fridge' || phase.kind === 'fridge-cooldown')
      .reduce((sum, phase) => sum + phase.hours, 0);
    expect(fridgeHours).toBeGreaterThanOrEqual(FERMENTATION.minFridgeHours);
  });

  it('bruger ikke køl til mellemlange planer', () => {
    const plan = selectFermentationStrategy(14, 22);
    expect(plan?.usesFridge).toBe(false);
    expect(plan?.strategy).toBe('room-temp');
  });

  it('regner ækvivalente timer varmere op i et varmt køkken', () => {
    const cold = selectFermentationStrategy(8, 16);
    const warm = selectFermentationStrategy(8, 28);
    expect(warm!.equivalentHoursAt20).toBeGreaterThan(cold!.equivalentHoursAt20);
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
