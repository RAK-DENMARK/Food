import { describe, expect, it } from 'vitest';
import { DEFAULT_HYDRATION, DEFAULT_SALT } from '../../config/dough';
import type { DoughInput } from '../../types';
import { validateInputs } from '../validation';
import { addHours } from '../../utils/time';

const now = new Date(2026, 8, 10, 12, 0);

function input(overrides: Partial<DoughInput> = {}): DoughInput {
  return {
    pizzaCount: 6,
    ballWeightG: 270,
    hydration: DEFAULT_HYDRATION,
    salt: DEFAULT_SALT,
    yeastType: 'IDY',
    roomTempC: 22,
    servingTime: addHours(now, 30),
    ...overrides,
  };
}

function codes(issues: { code: string }[]): string[] {
  return issues.map((issue) => issue.code);
}

describe('validateInputs', () => {
  it('accepterer standardinput', () => {
    const result = validateInputs(input(), now);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('afviser et serveringstidspunkt i fortiden', () => {
    const result = validateInputs(input({ servingTime: addHours(now, -2) }), now);
    expect(codes(result.errors)).toContain('serving-in-past');
  });

  it('afviser et serveringstidspunkt lige om lidt', () => {
    const result = validateInputs(input({ servingTime: addHours(now, 1) }), now);
    expect(codes(result.errors)).toContain('too-little-time');
  });

  it('advarer ved kort varsel', () => {
    const result = validateInputs(input({ servingTime: addHours(now, 5) }), now);
    expect(result.errors).toHaveLength(0);
    expect(codes(result.warnings)).toContain('short-notice');
  });

  it('afviser urealistiske dejboldvægte', () => {
    expect(codes(validateInputs(input({ ballWeightG: 100 }), now).errors)).toContain(
      'ball-weight-out-of-range',
    );
    expect(codes(validateInputs(input({ ballWeightG: 500 }), now).errors)).toContain(
      'ball-weight-out-of-range',
    );
    expect(validateInputs(input({ ballWeightG: 150 }), now).errors).toHaveLength(0);
    expect(validateInputs(input({ ballWeightG: 400 }), now).errors).toHaveLength(0);
  });

  it('afviser urealistisk hydrering', () => {
    expect(codes(validateInputs(input({ hydration: 0.45 }), now).errors)).toContain(
      'hydration-out-of-range',
    );
    expect(codes(validateInputs(input({ hydration: 0.85 }), now).errors)).toContain(
      'hydration-out-of-range',
    );
    expect(validateInputs(input({ hydration: 0.5 }), now).errors).toHaveLength(0);
    expect(validateInputs(input({ hydration: 0.8 }), now).errors).toHaveLength(0);
  });

  it('afviser urealistisk saltmængde', () => {
    expect(codes(validateInputs(input({ salt: 0.005 }), now).errors)).toContain('salt-out-of-range');
    expect(codes(validateInputs(input({ salt: 0.06 }), now).errors)).toContain('salt-out-of-range');
  });

  it('afviser umulige antal pizzaer', () => {
    expect(codes(validateInputs(input({ pizzaCount: 0 }), now).errors)).toContain(
      'pizza-count-out-of-range',
    );
    expect(codes(validateInputs(input({ pizzaCount: 40 }), now).errors)).toContain(
      'pizza-count-out-of-range',
    );
  });

  it('advarer ved temperaturer uden for modellens interval', () => {
    const cold = validateInputs(input({ roomTempC: 8 }), now);
    expect(cold.errors).toHaveLength(0);
    expect(codes(cold.warnings)).toContain('temp-outside-model');

    const hot = validateInputs(input({ roomTempC: 36 }), now);
    expect(hot.errors).toHaveLength(0);
    expect(codes(hot.warnings)).toContain('temp-outside-model');
  });

  it('afviser temperaturer helt uden for skiven', () => {
    expect(codes(validateInputs(input({ roomTempC: -5 }), now).errors)).toContain(
      'temp-outside-model',
    );
    expect(codes(validateInputs(input({ roomTempC: 60 }), now).errors)).toContain(
      'temp-outside-model',
    );
  });

  it('trækker lidt luft fra den tilgængelige tid', () => {
    const result = validateInputs(input({ servingTime: addHours(now, 10) }), now);
    expect(result.availableHours).toBeCloseTo(9.75, 6);
  });
});
