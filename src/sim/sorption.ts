import type { CalibrationProfile } from './types';

export function gabEquilibriumMoisture(aw: number, profile: CalibrationProfile): number {
  // GAB model: returns M_eq in kg water / kg dry solids
  const { gab_M0: M0, gab_C: C, gab_K: K } = profile;
  const Ka = K * aw;
  if (Ka >= 1) return 0.5; // clamp at saturation
  if (aw <= 0) return 0;
  return (M0 * C * Ka) / ((1 - Ka) * (1 - Ka + C * Ka));
}
