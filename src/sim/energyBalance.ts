import { humidAirCp } from './psychrometrics';

export function computeEnergyBalance(
  m_da: number,
  T_in_eff: number,
  T_out: number,
  X_in_mix: number,
  f_loss: number
): number {
  // Returns available heat in kW
  const cp = humidAirCp(X_in_mix);
  const Q_kJh = m_da * cp * (T_in_eff - T_out) * (1 - f_loss);
  return Q_kJh / 3600; // kW
}
