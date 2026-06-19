import { describe, it, expect } from 'vitest';
import { saturationPressure, absoluteHumidity, relativeHumidity } from '../psychrometrics';
import { gabEquilibriumMoisture } from '../sorption';
import { glassTg, stickyPoint } from '../glassTransition';
import { runSimulation } from '../simulator';
import { DEFAULT_CALIBRATION, DEFAULT_INPUTS } from '../../config/defaults';

describe('Psychrometrics', () => {
  it('saturationPressure at 0°C ≈ 611 Pa', () => {
    expect(saturationPressure(0)).toBeCloseTo(611, 0);
  });

  it('absoluteHumidity at 20°C, 50% RH is in reasonable range', () => {
    const X = absoluteHumidity(20, 0.5);
    expect(X).toBeGreaterThan(0.005);
    expect(X).toBeLessThan(0.015);
  });

  it('relativeHumidity round-trips with absoluteHumidity', () => {
    const X = absoluteHumidity(25, 0.6);
    const RH = relativeHumidity(25, X);
    expect(RH).toBeCloseTo(0.6, 2);
  });

  it('saturationPressure increases with temperature', () => {
    expect(saturationPressure(50)).toBeGreaterThan(saturationPressure(20));
    expect(saturationPressure(100)).toBeGreaterThan(saturationPressure(50));
  });
});

describe('GAB sorption', () => {
  it('returns reasonable values for aw 0.1 to 0.9', () => {
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach(aw => {
      const M = gabEquilibriumMoisture(aw, DEFAULT_CALIBRATION);
      expect(M).toBeGreaterThan(0.005);
      expect(M).toBeLessThan(0.6);
    });
  });

  it('M_eq increases monotonically with aw', () => {
    const M1 = gabEquilibriumMoisture(0.3, DEFAULT_CALIBRATION);
    const M2 = gabEquilibriumMoisture(0.6, DEFAULT_CALIBRATION);
    const M3 = gabEquilibriumMoisture(0.85, DEFAULT_CALIBRATION);
    expect(M2).toBeGreaterThan(M1);
    expect(M3).toBeGreaterThan(M2);
  });

  it('returns 0 for aw = 0', () => {
    expect(gabEquilibriumMoisture(0, DEFAULT_CALIBRATION)).toBe(0);
  });
});

describe('Gordon-Taylor glass transition', () => {
  it('higher moisture gives lower Tg', () => {
    const Tg_dry = glassTg(0.01, DEFAULT_CALIBRATION);
    const Tg_wet = glassTg(0.10, DEFAULT_CALIBRATION);
    expect(Tg_wet).toBeLessThan(Tg_dry);
  });

  it('sticky point is exactly Tg + deltaT_sp', () => {
    const w_p = 0.04;
    const Tg = glassTg(w_p, DEFAULT_CALIBRATION);
    const sp = stickyPoint(w_p, DEFAULT_CALIBRATION);
    expect(sp - Tg).toBeCloseTo(DEFAULT_CALIBRATION.deltaT_sp, 5);
  });

  it('dry powder (w_p=0.01) has Tg near Tg_s', () => {
    const Tg = glassTg(0.001, DEFAULT_CALIBRATION);
    expect(Tg).toBeGreaterThan(80); // near Tg_s = 101
  });
});

describe('Simulator', () => {
  it('produces valid results with default inputs', () => {
    const res = runSimulation(DEFAULT_INPUTS, DEFAULT_CALIBRATION);
    expect(res.m_powder).toBeGreaterThan(0);
    expect(res.w_p).toBeGreaterThan(0);
    expect(res.w_p).toBeLessThan(0.5);
    expect(res.T_out).toBeGreaterThan(20);
    expect(res.T_out).toBeLessThan(200);
    expect(res.converged).toBe(true);
  });

  it('higher T_main_in gives lower or equal w_p (drier powder)', () => {
    const res1 = runSimulation({ ...DEFAULT_INPUTS, T_main_in: 160 }, DEFAULT_CALIBRATION);
    const res2 = runSimulation({ ...DEFAULT_INPUTS, T_main_in: 200 }, DEFAULT_CALIBRATION);
    expect(res2.w_p).toBeLessThanOrEqual(res1.w_p + 0.001);
  });

  it('mass balance is closed within 10%', () => {
    const res = runSimulation(DEFAULT_INPUTS, DEFAULT_CALIBRATION);
    const feed_total = DEFAULT_INPUTS.m_feed;
    const mass_out = res.m_powder + res.m_evap;
    expect(Math.abs(mass_out - feed_total) / feed_total).toBeLessThan(0.10);
  });

  it('higher RH_amb does not decrease X_out', () => {
    // Higher ambient RH increases the moisture in inlet air, so X_out should be ≥
    const res1 = runSimulation({ ...DEFAULT_INPUTS, RH_amb: 20 }, DEFAULT_CALIBRATION);
    const res2 = runSimulation({ ...DEFAULT_INPUTS, RH_amb: 90 }, DEFAULT_CALIBRATION);
    // X_out includes evaporated water from feed; higher inlet humidity means higher X_out or same
    expect(res2.X_out).toBeGreaterThanOrEqual(res1.X_out);
  });

  it('Q_input is positive and non-trivial', () => {
    const res = runSimulation(DEFAULT_INPUTS, DEFAULT_CALIBRATION);
    expect(res.Q_input).toBeGreaterThan(1000); // kW
  });

  it('sticky status is one of the valid values', () => {
    const res = runSimulation(DEFAULT_INPUTS, DEFAULT_CALIBRATION);
    expect(['safe', 'warning', 'critical']).toContain(res.stickyStatus);
  });
});
