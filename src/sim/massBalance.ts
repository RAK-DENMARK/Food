export function computeMassBalance(
  m_feed: number,
  x_ds: number,
  m_evap: number
): { m_powder: number; m_ds: number; m_water_in: number } {
  const m_ds = m_feed * x_ds;
  const m_water_in = m_feed * (1 - x_ds);
  const m_powder = m_ds + Math.max(0, m_water_in - m_evap);
  return { m_powder, m_ds, m_water_in };
}
