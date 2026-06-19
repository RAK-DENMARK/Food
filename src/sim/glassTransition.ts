import type { CalibrationProfile } from './types';
import { gabEquilibriumMoisture } from './sorption';
import { relativeHumidity } from './psychrometrics';

export function glassTg(w_p: number, profile: CalibrationProfile): number {
  // w_p: moisture wet basis fraction
  // Gordon-Taylor equation
  const { Tg_s, Tg_w, k_GT } = profile;
  const w_s = 1 - w_p;
  const w_w = w_p;
  return (w_s * Tg_s + k_GT * w_w * Tg_w) / (w_s + k_GT * w_w);
}

export function stickyPoint(w_p: number, profile: CalibrationProfile): number {
  return glassTg(w_p, profile) + profile.deltaT_sp;
}

export function deltaTSticky(T_product: number, w_p: number, profile: CalibrationProfile): number {
  return T_product - stickyPoint(w_p, profile);
}

// Generate sticky curve points for plotting
export function stickyCurve(
  profile: CalibrationProfile,
  X_range: [number, number] = [0, 20],
  points = 50
): Array<{ X: number; T_sticky: number }> {
  const result: Array<{ X: number; T_sticky: number }> = [];
  for (let i = 0; i <= points; i++) {
    const X_gkg = X_range[0] + (i / points) * (X_range[1] - X_range[0]);
    const X = X_gkg / 1000; // kg/kg
    // Iterative: find T_sticky such that T_sticky = Tg(GAB(RH(T_sticky, X))) + offset
    let T_s = 60;
    for (let iter = 0; iter < 50; iter++) {
      const aw = Math.min(relativeHumidity(T_s, X), 0.99);
      const M_eq = gabEquilibriumMoisture(Math.max(aw, 0), profile);
      const w_p = M_eq / (1 + M_eq);
      const T_s_new = glassTg(w_p, profile) + profile.deltaT_sp;
      if (Math.abs(T_s_new - T_s) < 0.1) { T_s = T_s_new; break; }
      T_s = 0.5 * T_s + 0.5 * T_s_new;
    }
    result.push({ X: X_gkg, T_sticky: T_s });
  }
  return result;
}
