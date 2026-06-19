import React from 'react';
import { useSimStore } from '../store/simulationStore';
import { DEFAULT_CALIBRATION } from '../config/defaults';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { CalibrationProfile } from '../sim/types';

interface CalibSliderProps {
  label: string;
  paramKey: keyof CalibrationProfile;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

function CalibSlider({ label, paramKey, min, max, step = 0.01, unit = '' }: CalibSliderProps) {
  const { calibration, setCalibration } = useSimStore();
  const value = calibration[paramKey] as number;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-0.5">
        <label className="text-xs text-gray-700">{label}</label>
        <span className="text-xs font-mono font-semibold text-primary-700">
          {value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 0)} {unit}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => setCalibration(paramKey, parseFloat(e.target.value))}
          className="flex-1 accent-primary h-1.5"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setCalibration(paramKey, v);
          }}
          className="w-20 text-xs border border-gray-300 rounded px-1 py-0.5 text-right"
        />
      </div>
    </div>
  );
}

export function CalibrationPanel() {
  const { language, setCalibration, calibration } = useSimStore();
  const t = language === 'da' ? da : en;
  const cal = t.calibration;

  const handleReset = () => {
    (Object.keys(DEFAULT_CALIBRATION) as Array<keyof CalibrationProfile>).forEach(key => {
      const v = DEFAULT_CALIBRATION[key];
      if (typeof v === 'number') setCalibration(key, v);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-primary">{cal.title}</h2>
          <p className="text-xs text-gray-500">Profil: {calibration.name}</p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-1.5 border border-primary text-primary rounded text-sm hover:bg-primary-50 transition-colors"
        >
          {cal.reset}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{cal.gab}</h3>
        <CalibSlider label="M₀ – Monolagskapacitet (kg/kg)" paramKey="gab_M0" min={0.01} max={0.2} step={0.001} />
        <CalibSlider label="C – BET konstant" paramKey="gab_C" min={0.5} max={50} step={0.1} />
        <CalibSlider label="K – GAB konstant" paramKey="gab_K" min={0.5} max={1.0} step={0.005} />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{cal.gordon}</h3>
        <CalibSlider label="Tg,s – Glasovergang (tørstof)" paramKey="Tg_s" min={50} max={200} step={1} unit="°C" />
        <CalibSlider label="Tg,w – Glasovergang (vand)" paramKey="Tg_w" min={-200} max={-100} step={1} unit="°C" />
        <CalibSlider label="k_GT – Gordon-Taylor konstant" paramKey="k_GT" min={1} max={15} step={0.1} />
        <CalibSlider label="ΔT_sp – Klæbeoffset over Tg" paramKey="deltaT_sp" min={5} max={50} step={1} unit="°C" />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{cal.energy}</h3>
        <CalibSlider label="f_loss – Varmetabsfraktion" paramKey="f_loss" min={0} max={0.2} step={0.005} />
        <CalibSlider label="cp,solids – Varmekapacitet (kJ/kg·K)" paramKey="cp_solids" min={0.8} max={3.0} step={0.05} unit="kJ/kg·K" />
        <CalibSlider label="Maks. fordampningskapacitet" paramKey="maxEvapCapacity" min={500} max={15000} step={100} unit="kg/h" />
      </div>
    </div>
  );
}
