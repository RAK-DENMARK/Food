import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SimulationInputs, SimulationResults, CalibrationProfile, Snapshot, Case, RunLogEntry, LeaderboardEntry } from '../sim/types';
import { DEFAULT_INPUTS, DEFAULT_CALIBRATION } from '../config/defaults';
import { runSimulation } from '../sim/simulator';

// Load calibration profiles from localStorage
function loadStoredProfiles(): CalibrationProfile[] {
  try {
    const raw = localStorage.getItem('spraysim_calib_profiles');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveProfilesToStorage(profiles: CalibrationProfile[]) {
  try {
    localStorage.setItem('spraysim_calib_profiles', JSON.stringify(profiles));
  } catch (_) {}
}

// Load leaderboard from localStorage
function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem('spraysim_leaderboard');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem('spraysim_leaderboard', JSON.stringify(entries));
  } catch (_) {}
}

interface SimStore {
  inputs: SimulationInputs;
  results: SimulationResults | null;
  calibration: CalibrationProfile;
  snapshots: Snapshot[];
  activeCase: Case | null;
  language: 'da' | 'en';
  activeTab: string;

  // Run log
  runLog: RunLogEntry[];
  isLogging: boolean;
  logInterval: number;
  logStartTime: number | null;

  // Gamification leaderboard
  leaderboard: LeaderboardEntry[];

  // Calibration profiles
  calibrationProfiles: CalibrationProfile[];
  activeProfileId: string;

  setInput: (key: keyof SimulationInputs, value: number) => void;
  setCalibration: (key: keyof CalibrationProfile, value: number | string) => void;
  loadCase: (c: Case) => void;
  saveSnapshot: (name: string) => void;
  deleteSnapshot: (id: string) => void;
  setLanguage: (lang: 'da' | 'en') => void;
  setActiveTab: (tab: string) => void;
  recompute: () => void;

  // Run log actions
  startLogging: () => void;
  stopLogging: () => void;
  clearLog: () => void;
  appendLogEntry: () => void;
  exportLogCSV: () => void;
  exportLogJSON: () => void;

  // Gamification
  addLeaderboardEntry: (playerName: string, scores: { totalScore: number; scoreEnergy: number; scorePerformance: number; scoreQuality: number; scoreSafety: number }) => void;

  // Calibration profiles
  saveCalibrationProfile: (name: string, description: string) => void;
  loadCalibrationProfile: (id: string) => void;
  deleteCalibrationProfile: (id: string) => void;
  resetCalibrationToDefault: () => void;
}

export const useSimStore = create<SimStore>()(
  subscribeWithSelector((set, get) => ({
    inputs: DEFAULT_INPUTS,
    results: null,
    calibration: DEFAULT_CALIBRATION,
    snapshots: [],
    activeCase: null,
    language: 'da',
    activeTab: 'simulering',

    runLog: [],
    isLogging: false,
    logInterval: 5000,
    logStartTime: null,

    leaderboard: loadLeaderboard(),

    calibrationProfiles: loadStoredProfiles(),
    activeProfileId: 'default',

    setInput: (key, value) => {
      set(state => ({ inputs: { ...state.inputs, [key]: value } }));
      get().recompute();
    },

    setCalibration: (key, value) => {
      set(state => ({ calibration: { ...state.calibration, [key]: value } }));
      get().recompute();
    },

    loadCase: (c) => {
      set((_state) => ({
        activeCase: c,
        inputs: { ...DEFAULT_INPUTS, ...c.startInputs },
      }));
      get().recompute();
    },

    saveSnapshot: (name) => {
      const { inputs, results, snapshots } = get();
      if (!results) return;
      const snap: Snapshot = {
        id: Date.now().toString(),
        name,
        timestamp: Date.now(),
        inputs: { ...inputs },
        results: { ...results },
      };
      set({ snapshots: [...snapshots.slice(-3), snap] });
    },

    deleteSnapshot: (id) => {
      set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) }));
    },

    setLanguage: (lang) => set({ language: lang }),
    setActiveTab: (tab) => set({ activeTab: tab }),

    recompute: () => {
      const { inputs, calibration } = get();
      try {
        const results = runSimulation(inputs, calibration);
        set({ results });
      } catch (e) {
        console.error('Simulation error:', e);
      }
    },

    // Run log
    startLogging: () => {
      set({ isLogging: true, logStartTime: Date.now() });
    },

    stopLogging: () => {
      set({ isLogging: false });
    },

    clearLog: () => {
      set({ runLog: [], logStartTime: null });
    },

    appendLogEntry: () => {
      const { inputs, results, runLog, logStartTime } = get();
      if (!results) return;
      const now = Date.now();
      const entry: RunLogEntry = {
        timestamp: now,
        t_elapsed_s: logStartTime ? Math.round((now - logStartTime) / 1000) : 0,
        T_main_in: inputs.T_main_in,
        RH_amb: inputs.RH_amb,
        m_feed: inputs.m_feed,
        T_out: results.T_out,
        X_out: results.X_out,
        RH_out: results.RH_out,
        w_p: results.w_p,
        m_powder: results.m_powder,
        m_evap: results.m_evap,
        E_per_kg_powder: results.E_per_kg_powder,
        delta_T_sticky: results.delta_T_sticky,
        qualityIndex: results.qualityIndex,
        safetyRisk: results.safetyRisk,
      };
      set({ runLog: [...runLog, entry] });
    },

    exportLogCSV: () => {
      const { runLog } = get();
      if (runLog.length === 0) return;
      const headers = [
        'timestamp', 't_elapsed_s', 'T_main_in', 'RH_amb', 'm_feed',
        'T_out', 'X_out', 'RH_out', 'w_p', 'm_powder', 'm_evap',
        'E_per_kg_powder', 'delta_T_sticky', 'qualityIndex', 'safetyRisk'
      ];
      const rows = runLog.map(e => headers.map(h => (e as unknown as Record<string, unknown>)[h]).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spraysim_log_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },

    exportLogJSON: () => {
      const { runLog } = get();
      if (runLog.length === 0) return;
      const blob = new Blob([JSON.stringify(runLog, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spraysim_log_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Gamification
    addLeaderboardEntry: (playerName, scores) => {
      const entry: LeaderboardEntry = {
        id: Date.now().toString(),
        playerName,
        timestamp: Date.now(),
        ...scores,
      };
      const current = get().leaderboard;
      const updated = [...current, entry]
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10);
      set({ leaderboard: updated });
      saveLeaderboard(updated);
    },

    // Calibration profiles
    saveCalibrationProfile: (name, description) => {
      const { calibration, calibrationProfiles } = get();
      const newProfile: CalibrationProfile = {
        ...calibration,
        profileId: Date.now().toString(),
        name,
        description,
        createdAt: Date.now(),
      };
      const updated = [...calibrationProfiles, newProfile];
      set({ calibrationProfiles: updated, activeProfileId: newProfile.profileId });
      saveProfilesToStorage(updated);
    },

    loadCalibrationProfile: (id) => {
      const { calibrationProfiles } = get();
      const profile = calibrationProfiles.find(p => p.profileId === id);
      if (!profile) return;
      set({ calibration: { ...profile }, activeProfileId: id });
      get().recompute();
    },

    deleteCalibrationProfile: (id) => {
      const { calibrationProfiles } = get();
      const updated = calibrationProfiles.filter(p => p.profileId !== id);
      set({ calibrationProfiles: updated });
      saveProfilesToStorage(updated);
    },

    resetCalibrationToDefault: () => {
      set({ calibration: { ...DEFAULT_CALIBRATION }, activeProfileId: 'default' });
      get().recompute();
    },
  }))
);

// Run initial computation
useSimStore.getState().recompute();
