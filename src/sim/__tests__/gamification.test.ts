import { describe, it, expect } from 'vitest';

// Score calculation logic (duplicated here to test in isolation)
function calcScores(results: {
  E_per_kg_powder: number;
  m_powder: number;
  qualityIndex: number;
  safetyRisk: 'low' | 'medium' | 'high';
}) {
  const scoreEnergy = Math.max(
    0,
    Math.min(25, ((6000 - results.E_per_kg_powder) / (6000 - 4000)) * 25)
  );
  const scorePerformance = Math.max(
    0,
    Math.min(25, ((results.m_powder - 1000) / (4000 - 1000)) * 25)
  );
  const scoreQuality = Math.max(0, Math.min(25, results.qualityIndex * 0.25));
  const scoreSafety = results.safetyRisk === 'low' ? 25 : results.safetyRisk === 'medium' ? 10 : 0;
  const totalScore = Math.round(scoreEnergy + scorePerformance + scoreQuality + scoreSafety);
  return { totalScore, scoreEnergy, scorePerformance, scoreQuality, scoreSafety };
}

describe('Gamification score calculation', () => {
  it('gives max energy score when E < 4000 kJ/kg', () => {
    const s = calcScores({ E_per_kg_powder: 3500, m_powder: 2000, qualityIndex: 80, safetyRisk: 'low' });
    expect(s.scoreEnergy).toBe(25);
  });

  it('gives zero energy score when E > 6000 kJ/kg', () => {
    const s = calcScores({ E_per_kg_powder: 7000, m_powder: 2000, qualityIndex: 80, safetyRisk: 'low' });
    expect(s.scoreEnergy).toBe(0);
  });

  it('gives linear energy score at midpoint (5000 kJ/kg => ~12.5 pts)', () => {
    const s = calcScores({ E_per_kg_powder: 5000, m_powder: 2000, qualityIndex: 0, safetyRisk: 'high' });
    expect(s.scoreEnergy).toBeCloseTo(12.5, 0);
  });

  it('gives max safety score for low risk', () => {
    const s = calcScores({ E_per_kg_powder: 5000, m_powder: 2000, qualityIndex: 0, safetyRisk: 'low' });
    expect(s.scoreSafety).toBe(25);
  });

  it('gives 10 safety score for medium risk', () => {
    const s = calcScores({ E_per_kg_powder: 5000, m_powder: 2000, qualityIndex: 0, safetyRisk: 'medium' });
    expect(s.scoreSafety).toBe(10);
  });

  it('gives 0 safety score for high risk', () => {
    const s = calcScores({ E_per_kg_powder: 5000, m_powder: 2000, qualityIndex: 0, safetyRisk: 'high' });
    expect(s.scoreSafety).toBe(0);
  });

  it('perfect scenario gives 100 total', () => {
    const s = calcScores({ E_per_kg_powder: 3000, m_powder: 5000, qualityIndex: 100, safetyRisk: 'low' });
    expect(s.totalScore).toBe(100);
  });

  it('worst scenario gives 0 total', () => {
    const s = calcScores({ E_per_kg_powder: 8000, m_powder: 0, qualityIndex: 0, safetyRisk: 'high' });
    expect(s.totalScore).toBe(0);
  });
});
