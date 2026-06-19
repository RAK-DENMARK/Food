import React, { useState, useEffect } from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import { DEFAULT_INPUTS } from '../config/defaults';

// --- Score calculation ---
function calcScores(results: NonNullable<ReturnType<typeof useSimStore.getState>['results']>) {
  // Energy: target < 4000 kJ/kg = 25pts, > 6000 = 0pts
  const scoreEnergy = Math.max(
    0,
    Math.min(25, ((6000 - results.E_per_kg_powder) / (6000 - 4000)) * 25)
  );
  // Performance: > 4000 kg/h = 25pts, < 1000 = 0pts
  const scorePerformance = Math.max(
    0,
    Math.min(25, ((results.m_powder - 1000) / (4000 - 1000)) * 25)
  );
  // Quality: qualityIndex 0-100 → 0-25
  const scoreQuality = Math.max(0, Math.min(25, results.qualityIndex * 0.25));
  // Safety: low=25, medium=10, high=0
  const scoreSafety = results.safetyRisk === 'low' ? 25 : results.safetyRisk === 'medium' ? 10 : 0;
  const totalScore = Math.round(scoreEnergy + scorePerformance + scoreQuality + scoreSafety);
  return {
    totalScore,
    scoreEnergy: Math.round(scoreEnergy),
    scorePerformance: Math.round(scorePerformance),
    scoreQuality: Math.round(scoreQuality),
    scoreSafety,
  };
}

// Failure mode check
interface FailureMode {
  key: string;
  triggered: boolean;
  everTriggered: boolean;
}

function ScoreBar({ label, score, max = 25, color }: { label: string; score: number; max?: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-700 mb-0.5">
        <span>{label}</span>
        <span className="font-mono font-semibold">{score}/{max}</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OptimeringGame() {
  const { results, leaderboard, addLeaderboardEntry, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const g = t.gamification;
  const [playerName, setPlayerName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  if (!results) return <p className="text-gray-400 text-sm">Ingen simuleringsresultater endnu.</p>;

  const scores = calcScores(results);
  const totalPct = scores.totalScore;

  const totalColor = totalPct >= 75 ? 'bg-green-500' : totalPct >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const handleSave = () => {
    if (!playerName.trim()) return;
    addLeaderboardEntry(playerName.trim(), scores);
    setSavedMsg(language === 'da' ? 'Score gemt!' : 'Score saved!');
    setPlayerName('');
    setShowSave(false);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 italic">{g.goal}</p>

      {/* Total score */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${totalColor}`}>
          {scores.totalScore}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{g.totalScore}</p>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${totalColor}`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{scores.totalScore}/100</p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <ScoreBar label={g.scoreEnergy} score={scores.scoreEnergy} color="bg-blue-500" />
        <ScoreBar label={g.scorePerformance} score={scores.scorePerformance} color="bg-green-500" />
        <ScoreBar label={g.scoreQuality} score={scores.scoreQuality} color="bg-purple-500" />
        <ScoreBar label={g.scoreSafety} score={scores.scoreSafety} color="bg-orange-500" />
      </div>

      {/* Save score */}
      <div className="bg-white rounded-lg shadow p-4">
        {savedMsg && <p className="text-green-600 text-sm font-medium mb-2">{savedMsg}</p>}
        {!showSave ? (
          <button
            onClick={() => setShowSave(true)}
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            {g.saveScore}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={g.playerName}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSave}
              disabled={!playerName.trim()}
              className="px-4 py-1.5 bg-primary text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {g.saveScore}
            </button>
            <button
              onClick={() => setShowSave(false)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{g.leaderboard}</h4>
        {leaderboard.length === 0 ? (
          <p className="text-gray-400 text-xs">{g.noScores}</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 text-gray-500">{g.leaderboardRank}</th>
                <th className="text-left py-1.5 text-gray-500">{g.leaderboardPlayer}</th>
                <th className="text-center py-1.5 text-gray-500">{g.leaderboardScore}</th>
                <th className="text-right py-1.5 text-gray-500">{g.leaderboardTime}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.id} className={`border-t border-gray-100 ${i === 0 ? 'bg-yellow-50' : ''}`}>
                  <td className="py-1.5 text-gray-500">{i + 1}</td>
                  <td className="py-1.5 font-medium text-gray-800">{entry.playerName}</td>
                  <td className="py-1.5 text-center">
                    <span className={`font-bold ${entry.totalScore >= 75 ? 'text-green-600' : entry.totalScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {entry.totalScore}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BrydTaarnet() {
  const { results, setInput, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const g = t.gamification;

  const [everTriggered, setEverTriggered] = useState<Record<string, boolean>>({});

  const failureModes = results ? [
    {
      key: 'fouling',
      triggered: results.delta_T_sticky > 0,
      icon: '🔴',
      title: g.failures.fouling.title,
      description: g.failures.fouling.description,
    },
    {
      key: 'kvalitet',
      triggered: results.qualityIndex < 40,
      icon: '🔴',
      title: g.failures.kvalitet.title,
      description: g.failures.kvalitet.description,
    },
    {
      key: 'energi',
      triggered: results.E_per_kg_powder > 6000,
      icon: '🟡',
      title: g.failures.energi.title,
      description: g.failures.energi.description,
    },
    {
      key: 'atex',
      triggered: results.safetyRisk === 'high',
      icon: '🔴',
      title: g.failures.atex.title,
      description: g.failures.atex.description,
    },
    {
      key: 'fordampning',
      triggered: results.m_evap < 500,
      icon: '🔴',
      title: g.failures.fordampning.title,
      description: g.failures.fordampning.description,
    },
  ] : [];

  // Track ever triggered
  useEffect(() => {
    if (!results) return;
    const newEver = { ...everTriggered };
    let changed = false;
    failureModes.forEach(fm => {
      if (fm.triggered && !newEver[fm.key]) {
        newEver[fm.key] = true;
        changed = true;
      }
    });
    if (changed) setEverTriggered(newEver);
  }, [results]);

  const sessionCount = Object.values(everTriggered).filter(Boolean).length;

  const handleReset = () => {
    Object.keys(DEFAULT_INPUTS).forEach(k => {
      const key = k as keyof typeof DEFAULT_INPUTS;
      setInput(key, DEFAULT_INPUTS[key] as number);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 italic">{g.failureGoal}</p>

      <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
        <span className="text-sm text-gray-700">{g.failuresTriggered}:</span>
        <span className="text-2xl font-bold text-primary">{sessionCount}/5</span>
      </div>

      <div className="space-y-2">
        {failureModes.map(fm => (
          <div
            key={fm.key}
            className={`rounded-lg p-3 border transition-all ${
              fm.triggered
                ? 'bg-red-50 border-red-300'
                : everTriggered[fm.key]
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{fm.icon}</span>
              <span className={`text-sm font-medium ${fm.triggered ? 'text-red-800' : 'text-gray-800'}`}>
                {fm.title}
              </span>
              {everTriggered[fm.key] && !fm.triggered && (
                <span className="ml-auto text-xs text-green-600 font-medium">✓ {language === 'da' ? 'Rettet' : 'Fixed'}</span>
              )}
              {fm.triggered && (
                <span className="ml-auto text-xs text-red-600 font-medium">{language === 'da' ? 'AKTIV' : 'ACTIVE'}</span>
              )}
            </div>
            {fm.triggered && (
              <p className="mt-2 text-xs text-red-700 leading-relaxed">{fm.description}</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleReset}
        className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {g.resetToDefault}
      </button>
    </div>
  );
}

export function Gamification() {
  const { language } = useSimStore();
  const t = language === 'da' ? da : en;
  const g = t.gamification;
  const [mode, setMode] = useState<'optimering' | 'bryd'>('optimering');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-primary">{g.title}</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('optimering')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'optimering' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {g.optimering}
          </button>
          <button
            onClick={() => setMode('bryd')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === 'bryd' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {g.brydTaarnet}
          </button>
        </div>
      </div>

      {mode === 'optimering' ? <OptimeringGame /> : <BrydTaarnet />}
    </div>
  );
}
