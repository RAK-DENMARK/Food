import type { SimulationInputs } from './types';

export function computeSafety(
  inputs: SimulationInputs,
  w_p: number,
  T_out: number
): { safetyRisk: 'low' | 'medium' | 'high'; safetyFactors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  // HEURISTIC: ATEX dust explosion risk factors (educational only)
  if (w_p < 0.03) { factors.push('Meget tørt pulver (støvrisiko)'); riskScore += 2; }
  if (T_out > 100) { factors.push('Høj udblæsningstemperatur'); riskScore += 1; }
  if (inputs.m_feed > 12000) { factors.push('Høj produktionsrate'); riskScore += 1; }
  if (inputs.co2 > 0) { factors.push('CO₂ injektion aktiv (inertering)'); riskScore -= 1; }

  const safetyRisk: 'low' | 'medium' | 'high' =
    riskScore <= 0 ? 'low' : riskScore <= 2 ? 'medium' : 'high';

  return { safetyRisk, safetyFactors: factors };
}
