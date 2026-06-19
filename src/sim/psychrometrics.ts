const P_ATM = 101325; // Pa

export function saturationPressure(T_C: number): number {
  // Magnus formula, returns Pa
  return 610.94 * Math.exp(17.625 * T_C / (243.04 + T_C));
}

export function absoluteHumidity(T_C: number, RH_frac: number): number {
  // RH_frac as fraction (0-1), returns kg/kg dry air
  const pv = RH_frac * saturationPressure(T_C);
  return 0.622 * pv / (P_ATM - pv);
}

export function relativeHumidity(T_C: number, X: number): number {
  // X in kg/kg dry air, returns fraction (0-1)
  const pv = X * P_ATM / (0.622 + X);
  return pv / saturationPressure(T_C);
}

export function humidAirEnthalpy(T_C: number, X: number): number {
  // kJ/kg dry air
  return 1.006 * T_C + X * (2501 + 1.86 * T_C);
}

export function humidAirCp(X: number): number {
  // kJ/kg·K dry air
  return 1.006 + 1.86 * X;
}
