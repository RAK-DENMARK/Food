import { describe, expect, it } from 'vitest';
import {
  formatDay,
  formatDayTime,
  formatDurationHours,
  formatGrams,
  formatNumber,
  formatPercent,
  formatSalt,
  formatTemp,
  formatTime,
  formatYeast,
} from '../format';

describe('afrunding af ingredienser', () => {
  it('viser mel og vand i hele gram', () => {
    expect(formatGrams(981.104)).toBe('981 g');
    expect(formatGrams(608.284)).toBe('608 g');
  });

  it('viser salt i hele gram fra 10 g og op', () => {
    expect(formatSalt(29.43)).toBe('29 g');
    expect(formatSalt(7.42)).toBe('7,4 g');
  });

  it('viser gær med to decimaler', () => {
    expect(formatYeast(1.177)).toBe('1,18 g');
    expect(formatYeast(0.351)).toBe('0,35 g');
  });

  it('runder aldrig en lille gærmængde ned til nul', () => {
    expect(formatYeast(0.004)).toBe('0,01 g');
    expect(formatYeast(0.0001)).toBe('0,01 g');
    expect(formatYeast(0.049)).toBe('0,05 g');
  });

  it('viser store gærmængder med én decimal', () => {
    expect(formatYeast(12.34)).toBe('12,3 g');
  });

  it('bruger dansk decimalkomma', () => {
    expect(formatNumber(3.5, 1)).toBe('3,5');
    expect(formatPercent(0.0012)).toBe('0,12 %');
  });
});

describe('tid og dato på dansk', () => {
  const reference = new Date(2026, 8, 10, 12, 0); // torsdag

  it('viser klokkeslæt med to cifre', () => {
    expect(formatTime(new Date(2026, 8, 10, 9, 5))).toBe('09:05');
    expect(formatTime(new Date(2026, 8, 10, 18, 0))).toBe('18:00');
  });

  it('siger i dag, i morgen og i overmorgen', () => {
    expect(formatDay(new Date(2026, 8, 10, 20, 0), reference)).toBe('I dag');
    expect(formatDay(new Date(2026, 8, 11, 8, 0), reference)).toBe('I morgen');
    expect(formatDay(new Date(2026, 8, 12, 8, 0), reference)).toBe('I overmorgen');
  });

  it('bruger ugedagsnavn inden for ugen', () => {
    expect(formatDay(new Date(2026, 8, 14, 8, 0), reference)).toBe('Mandag');
  });

  it('bruger dato længere ude i fremtiden', () => {
    expect(formatDay(new Date(2026, 8, 24, 8, 0), reference)).toBe('Tor. 24. sep.');
  });

  it('sætter dag og klokkeslæt sammen', () => {
    expect(formatDayTime(new Date(2026, 8, 12, 18, 0), reference)).toBe('I overmorgen 18:00');
  });

  it('formaterer varigheder naturligt', () => {
    expect(formatDurationHours(0.5)).toBe('30 min.');
    expect(formatDurationHours(1)).toBe('1 time');
    expect(formatDurationHours(2)).toBe('2 timer');
    expect(formatDurationHours(3.5)).toBe('3 timer og 30 min.');
  });

  it('viser temperatur i hele grader', () => {
    expect(formatTemp(22.4)).toBe('22 °C');
  });
});
