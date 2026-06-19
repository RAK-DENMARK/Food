import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SimulationInputs, SimulationResults, CalibrationProfile, Snapshot, Case } from '../sim/types';
import { DEFAULT_INPUTS, DEFAULT_CALIBRATION } from '../config/defaults';
import { runSimulation } from '../sim/simulator';

interface SimStore {
  inputs: SimulationInputs;
  results: SimulationResults | null;
  calibration: CalibrationProfile;
  snapshots: Snapshot[];
  activeCase: Case | null;
  language: 'da' | 'en';
  activeTab: string;

  setInput: (key: keyof SimulationInputs, value: number) => void;
  setCalibration: (key: keyof CalibrationProfile, value: number) => void;
  loadCase: (c: Case) => void;
  saveSnapshot: (name: string) => void;
  deleteSnapshot: (id: string) => void;
  setLanguage: (lang: 'da' | 'en') => void;
  setActiveTab: (tab: string) => void;
  recompute: () => void;
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
  }))
);

// Run initial computation
useSimStore.getState().recompute();
