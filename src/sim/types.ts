export interface CalibrationProfile {
  name: string;
  gab_M0: number;
  gab_C: number;
  gab_K: number;
  Tg_s: number;
  Tg_w: number;
  k_GT: number;
  deltaT_sp: number;
  f_loss: number;
  cp_solids: number;
  maxEvapCapacity: number;
}

export interface SimulationInputs {
  T_amb: number;
  RH_amb: number;
  m_feed: number;
  x_ds: number;
  T_feed: number;
  m_main_air: number;
  T_main_in: number;
  X_main_in: number;
  m_ifb: number;
  T_ifb: number;
  X_ifb: number;
  m_efb: number;
  T_efb: number;
  X_efb: number;
  nozzlePressure: number;
  nozzleCount: number;
  homogenPressure1: number;
  homogenPressure2: number;
  lecithin: number;
  co2: number;
}

export interface SimulationResults {
  m_powder: number;
  w_p: number;
  M_eq: number;
  T_product: number;
  ISi: number;
  qualityIndex: number;
  T_out: number;
  X_out: number;
  RH_out: number;
  Q_input: number;
  E_per_kg_powder: number;
  E_per_kg_evap: number;
  m_evap: number;
  towerUtilization: number;
  Tg_mix: number;
  T_sticky: number;
  delta_T_sticky: number;
  stickyStatus: 'safe' | 'warning' | 'critical';
  safetyRisk: 'low' | 'medium' | 'high';
  safetyFactors: string[];
  converged: boolean;
  iterations: number;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  inputs: SimulationInputs;
  results: SimulationResults;
}

export interface Case {
  id: string;
  titleDa: string;
  titleEn: string;
  descriptionDa: string;
  descriptionEn: string;
  level: 'basic' | 'advanced' | 'pro';
  startInputs: Partial<SimulationInputs>;
  goalsDa: string[];
  goalsEn: string[];
  facitHints: string[];
}
