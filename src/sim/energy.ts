import { humidAirCp } from './psychrometrics';

export function computeQInput(
  m_main_air: number, T_main_in: number, X_main_in: number,
  m_ifb: number, T_ifb: number, X_ifb: number,
  m_efb: number, T_efb: number, X_efb: number,
  T_amb: number, _X_amb: number,
  m_feed: number, T_feed: number, cp_solids: number
): number {
  // kW - heat to raise each air stream from ambient to inlet temp
  const Q_main = m_main_air * humidAirCp(X_main_in / 1000) * (T_main_in - T_amb) / 3600;
  const Q_ifb_val = m_ifb * humidAirCp(X_ifb / 1000) * Math.max(0, T_ifb - T_amb) / 3600;
  const Q_efb_val = m_efb * humidAirCp(X_efb / 1000) * Math.max(0, T_efb - T_amb) / 3600;
  // Feed preheating (solids from ~15°C to T_feed)
  const T_ref = 15;
  const Q_feed = m_feed * cp_solids * Math.max(0, T_feed - T_ref) / 3600;
  return Math.max(0, Q_main + Q_ifb_val + Q_efb_val + Q_feed);
}
