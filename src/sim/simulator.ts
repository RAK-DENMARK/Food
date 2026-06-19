import type { SimulationInputs, SimulationResults, CalibrationProfile } from './types';
import { absoluteHumidity, relativeHumidity, humidAirCp } from './psychrometrics';
import { gabEquilibriumMoisture } from './sorption';
import { glassTg, stickyPoint, deltaTSticky } from './glassTransition';
import { computeISi, computeQualityIndex } from './quality';
import { computeSafety } from './safety';
import { computeQInput } from './energy';

const LAMBDA = 2501; // kJ/kg latent heat of vaporization at 0°C

export function runSimulation(
  inputs: SimulationInputs,
  profile: CalibrationProfile
): SimulationResults {
  const {
    T_amb, RH_amb, m_feed, x_ds, T_feed,
    m_main_air, T_main_in, X_main_in,
    m_ifb, T_ifb, X_ifb,
    m_efb, T_efb, X_efb,
    nozzlePressure,
    homogenPressure1,
    lecithin,
  } = inputs;

  // Main drying air is drawn from the atmosphere and heated; heating does NOT change absolute
  // humidity, so X_main = X_amb. X_main_in is ignored for the main air stream and only kept
  // in the input struct for pro-level conditioned-air scenarios (future).
  const X_amb = absoluteHumidity(T_amb, RH_amb / 100);
  const X_main = X_amb; // ambient humidity drives the main air moisture content
  const X_ifb_kgkg = X_ifb / 1000;
  const X_efb_kgkg = X_efb / 1000;

  // Total dry air mass flow (kg/h)
  const m_da = m_main_air + m_ifb + m_efb;

  // Weighted average inlet humidity (kg/kg)
  const X_in_mix = (m_main_air * X_main + m_ifb * X_ifb_kgkg + m_efb * X_efb_kgkg) / m_da;

  // Energy-weighted average inlet temperature
  const cp_main = humidAirCp(X_main);
  const cp_ifb = humidAirCp(X_ifb_kgkg);
  const cp_efb = humidAirCp(X_efb_kgkg);
  const T_in_eff = (m_main_air * cp_main * T_main_in + m_ifb * cp_ifb * T_ifb + m_efb * cp_efb * T_efb)
    / (m_main_air * cp_main + m_ifb * cp_ifb + m_efb * cp_efb);

  // Feed composition
  const m_ds = m_feed * x_ds;
  const m_water_in_feed = m_feed * (1 - x_ds);

  const cp_mix = humidAirCp(X_in_mix);

  // Bisection to find equilibrium T_out
  let T_low = 30;
  let T_high = Math.max(T_in_eff - 1, 31);
  let T_out = (T_low + T_high) / 2;
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < 100; iter++) {
    iterations = iter + 1;
    T_out = (T_low + T_high) / 2;

    // Available heat from air cooling
    const Q_air_kJh = m_da * cp_mix * (T_in_eff - T_out) * (1 - profile.f_loss);

    // Estimate outlet humidity from energy balance
    // m_evap_energy = Q_air / (LAMBDA + sensible_correction)
    const m_evap_est = Math.min(m_water_in_feed, Q_air_kJh / LAMBDA);
    const X_out_est = X_in_mix + m_evap_est / m_da;

    // Equilibrium moisture from RH at outlet
    const RH_out_est = Math.max(0, Math.min(0.99, relativeHumidity(T_out, X_out_est)));
    const M_eq_est = gabEquilibriumMoisture(RH_out_est, profile);

    // Actual evaporation from mass balance
    const m_evap_act = Math.max(0, m_water_in_feed - m_ds * M_eq_est);
    const m_powder_act = m_ds + m_ds * M_eq_est;

    // Heat required
    const Q_evap = m_evap_act * LAMBDA;
    // Small sensible correction for powder warming
    const Q_sensible = m_powder_act * profile.cp_solids * Math.max(0, T_out - T_feed) * 0.05;
    const Q_needed = Q_evap + Q_sensible;

    const residual = Q_air_kJh - Q_needed;

    if (Math.abs(residual) < Q_air_kJh * 0.001) { converged = true; break; }

    if (residual > 0) {
      // More heat than needed → T_out should be higher (less heat extracted)
      T_low = T_out;
    } else {
      T_high = T_out;
    }
  }

  // Final state: iterate X_out and M_eq for self-consistency
  let X_out_final = X_in_mix + 0.001;
  let M_eq_final = 0.05;
  for (let i = 0; i < 30; i++) {
    const RH_out_i = Math.max(0, Math.min(0.99, relativeHumidity(T_out, X_out_final)));
    const M_new = gabEquilibriumMoisture(RH_out_i, profile);
    const m_evap_i = Math.max(0, m_water_in_feed - m_ds * M_new);
    const X_new = X_in_mix + m_evap_i / m_da;
    if (Math.abs(X_new - X_out_final) < 1e-7) { M_eq_final = M_new; X_out_final = X_new; break; }
    X_out_final = X_new;
    M_eq_final = M_new;
  }

  const RH_out_final = relativeHumidity(T_out, X_out_final);
  const m_evap_final = Math.max(0, m_water_in_feed - m_ds * M_eq_final);
  const m_powder_final = m_ds + m_ds * M_eq_final;
  const w_p_final = M_eq_final / (1 + M_eq_final);

  // Product temperature: slightly cooler than exhaust
  const T_product = T_out - 5;

  // Energy KPIs
  const Q_input = computeQInput(
    m_main_air, T_main_in, X_main_in,
    m_ifb, T_ifb, X_ifb,
    m_efb, T_efb, X_efb,
    T_amb, X_amb,
    m_feed, T_feed, profile.cp_solids
  );
  const E_per_kg_powder = m_powder_final > 0 ? (Q_input * 3600) / m_powder_final : 0;
  const E_per_kg_evap = m_evap_final > 0 ? (Q_input * 3600) / m_evap_final : 0;
  const towerUtilization = Math.min(1, m_evap_final / profile.maxEvapCapacity);

  // Stickiness
  const Tg_mix = glassTg(w_p_final, profile);
  const T_sticky = stickyPoint(w_p_final, profile);
  const delta_T_sticky = deltaTSticky(T_product, w_p_final, profile);
  const stickyStatus: 'safe' | 'warning' | 'critical' =
    delta_T_sticky < -10 ? 'safe' : delta_T_sticky < 0 ? 'warning' : 'critical';

  // Quality
  const ISi = computeISi(T_out, nozzlePressure, homogenPressure1, inputs);
  const qualityIndex = computeQualityIndex(ISi, w_p_final, delta_T_sticky);

  // Safety
  const { safetyRisk, safetyFactors } = computeSafety(inputs, w_p_final, T_out);

  // Suppress unused warning
  void lecithin;

  return {
    m_powder: m_powder_final,
    w_p: w_p_final,
    M_eq: M_eq_final,
    T_product,
    ISi,
    qualityIndex,
    T_out,
    X_out: X_out_final * 1000, // g/kg for display
    RH_out: RH_out_final * 100,
    Q_input,
    E_per_kg_powder,
    E_per_kg_evap,
    m_evap: m_evap_final,
    towerUtilization,
    Tg_mix,
    T_sticky,
    delta_T_sticky,
    stickyStatus,
    safetyRisk,
    safetyFactors,
    converged,
    iterations,
  };
}
