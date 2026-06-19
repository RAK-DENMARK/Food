import type { SimulationInputs } from './types';

export function computeISi(
  T_out: number,
  nozzlePressure: number,
  homogenPressure1: number,
  inputs: SimulationInputs
): number {
  // HEURISTIC: ISi increases with outlet temp and homogenization pressure
  let ISi = 0.2;
  if (T_out > 80) ISi += (T_out - 80) * 0.01;
  if (homogenPressure1 > 200) ISi += (homogenPressure1 - 200) * 0.002;
  if (nozzlePressure > 300) ISi += (nozzlePressure - 300) * 0.001;
  // HEURISTIC: lecithin reduces ISi
  ISi -= inputs.lecithin * 0.05;
  return Math.max(0, Math.min(5, ISi));
}

export function computeQualityIndex(
  ISi: number,
  w_p: number,
  delta_T_sticky: number
): number {
  // 0-100, higher is better
  let q = 100;
  q -= ISi * 10;
  if (w_p > 0.05) q -= (w_p - 0.05) * 500;
  if (delta_T_sticky > 0) q -= delta_T_sticky * 5;
  return Math.max(0, Math.min(100, q));
}
