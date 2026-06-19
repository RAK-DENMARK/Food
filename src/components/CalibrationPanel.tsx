import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useSimStore } from '../store/simulationStore';
import { DEFAULT_CALIBRATION, DEFAULT_INPUTS } from '../config/defaults';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { CalibrationProfile, MeasuredPoint } from '../sim/types';
import { runSimulation } from '../sim/simulator';

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

function deviationPct(sim: number, meas: number): number {
  if (meas === 0) return 0;
  return ((sim - meas) / Math.abs(meas)) * 100;
}

function deviationClass(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 5) return 'text-green-700 bg-green-50';
  if (abs <= 15) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
}

const EMPTY_POINT: MeasuredPoint = {
  label: '',
  inputs: {},
  measured_T_out: 75,
  measured_w_p: 4,
  measured_m_powder: 3000,
};

export function CalibrationPanel() {
  const {
    language,
    setCalibration,
    calibration,
    calibrationProfiles,
    activeProfileId,
    saveCalibrationProfile,
    loadCalibrationProfile,
    deleteCalibrationProfile,
    resetCalibrationToDefault,
  } = useSimStore();
  const t = language === 'da' ? da : en;
  const cal = t.calibration;

  // Profile management state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Fit validation state
  const [measuredPoints, setMeasuredPoints] = useState<MeasuredPoint[]>([]);
  const [editingPoint, setEditingPoint] = useState<MeasuredPoint>({ ...EMPTY_POINT });
  const [showAddPoint, setShowAddPoint] = useState(false);

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) return;
    saveCalibrationProfile(newProfileName.trim(), newProfileDesc.trim());
    setSavedMsg(language === 'da' ? 'Profil gemt!' : 'Profile saved!');
    setNewProfileName('');
    setNewProfileDesc('');
    setShowSaveForm(false);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleReset = () => {
    resetCalibrationToDefault();
  };

  // Compute simulated results for measured points
  const pointResults = measuredPoints.map(pt => {
    try {
      const inputs = { ...DEFAULT_INPUTS, ...pt.inputs };
      const res = runSimulation(inputs, calibration);
      return res;
    } catch (_) {
      return null;
    }
  });

  // RMS deviation
  const rmsValues: number[] = [];
  pointResults.forEach((res, i) => {
    if (!res) return;
    const pt = measuredPoints[i];
    rmsValues.push(Math.pow(deviationPct(res.T_out, pt.measured_T_out), 2));
    rmsValues.push(Math.pow(deviationPct(res.w_p * 100, pt.measured_w_p), 2));
    rmsValues.push(Math.pow(deviationPct(res.m_powder, pt.measured_m_powder), 2));
  });
  const rms = rmsValues.length > 0 ? Math.sqrt(rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length) : null;

  // Scatter data for T_out comparison
  const scatterT = pointResults
    .map((res, i) => res ? { sim: res.T_out, meas: measuredPoints[i].measured_T_out, label: measuredPoints[i].label } : null)
    .filter(Boolean) as { sim: number; meas: number; label: string }[];

  const scatterW = pointResults
    .map((res, i) => res ? { sim: res.w_p * 100, meas: measuredPoints[i].measured_w_p, label: measuredPoints[i].label } : null)
    .filter(Boolean) as { sim: number; meas: number; label: string }[];

  const addPoint = () => {
    if (!editingPoint.label.trim()) return;
    setMeasuredPoints(prev => [...prev, { ...editingPoint }]);
    setEditingPoint({ ...EMPTY_POINT });
    setShowAddPoint(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── PROFILE MANAGER ── */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{cal.profiles}</h3>

        {savedMsg && <p className="text-green-600 text-xs font-medium mb-2">{savedMsg}</p>}

        {/* Active profile info */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">{cal.activeProfile}:</span>
          <span className="text-xs font-semibold text-primary">{calibration.name}</span>
        </div>

        {/* Profile dropdown */}
        {calibrationProfiles.length > 0 && (
          <div className="flex gap-2 mb-3">
            <select
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
              value={activeProfileId}
              onChange={e => loadCalibrationProfile(e.target.value)}
            >
              <option value="default">{language === 'da' ? '-- Vælg profil --' : '-- Select profile --'}</option>
              {calibrationProfiles.map(p => (
                <option key={p.profileId} value={p.profileId}>
                  {p.name} {p.description ? `– ${p.description}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (window.confirm(language === 'da' ? 'Slet denne profil?' : 'Delete this profile?')) {
                  deleteCalibrationProfile(activeProfileId);
                }
              }}
              disabled={activeProfileId === 'default' || !calibrationProfiles.find(p => p.profileId === activeProfileId)}
              className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              {cal.deleteProfile}
            </button>
          </div>
        )}

        {calibrationProfiles.length === 0 && (
          <p className="text-gray-400 text-xs mb-3">{cal.noProfiles}</p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-600 transition-colors"
          >
            {cal.saveProfile}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 border border-primary text-primary rounded text-xs hover:bg-primary-50 transition-colors"
          >
            {cal.reset}
          </button>
        </div>

        {/* Save form */}
        {showSaveForm && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <input
              type="text"
              placeholder={cal.profileName}
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder={cal.profileDescription}
              value={newProfileDesc}
              onChange={e => setNewProfileDesc(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={!newProfileName.trim()}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs disabled:opacity-50"
              >
                {cal.saveProfile}
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CONSTANTS EDITOR ── */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-primary">{cal.title}</h2>
          <p className="text-xs text-gray-500">Profil: {calibration.name}</p>
        </div>
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

      {/* ── FIT VALIDATION ── */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{cal.fitValidation}</h3>

        {measuredPoints.length === 0 && !showAddPoint && (
          <p className="text-gray-400 text-xs mb-3">
            {language === 'da'
              ? 'Tilføj målepunkter for at validere kalibreringens præcision.'
              : 'Add measured points to validate calibration accuracy.'}
          </p>
        )}

        {/* Add point form */}
        {showAddPoint && (
          <div className="bg-gray-50 rounded p-3 mb-3 space-y-2">
            <input
              type="text"
              placeholder={cal.measuredLabel}
              value={editingPoint.label}
              onChange={e => setEditingPoint(p => ({ ...p, label: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">{cal.measured_T_out}</label>
                <input
                  type="number"
                  value={editingPoint.measured_T_out}
                  onChange={e => setEditingPoint(p => ({ ...p, measured_T_out: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{cal.measured_w_p}</label>
                <input
                  type="number"
                  value={editingPoint.measured_w_p}
                  step={0.1}
                  onChange={e => setEditingPoint(p => ({ ...p, measured_w_p: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{cal.measured_m_powder}</label>
                <input
                  type="number"
                  value={editingPoint.measured_m_powder}
                  onChange={e => setEditingPoint(p => ({ ...p, measured_m_powder: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addPoint}
                disabled={!editingPoint.label.trim()}
                className="px-3 py-1 bg-primary text-white rounded text-xs disabled:opacity-50"
              >
                {cal.addMeasuredPoint}
              </button>
              <button
                onClick={() => setShowAddPoint(false)}
                className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {!showAddPoint && (
          <button
            onClick={() => setShowAddPoint(true)}
            className="mb-3 px-3 py-1.5 border border-primary text-primary rounded text-xs hover:bg-primary-50 transition-colors"
          >
            + {cal.addMeasuredPoint}
          </button>
        )}

        {/* Fit table */}
        {measuredPoints.length > 0 && (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 pr-3 text-gray-500">{cal.measuredLabel}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">T_out: {cal.measured}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">T_out: {cal.simulated}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">ΔT_out</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">w_p: {cal.measured}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">w_p: {cal.simulated}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">Δw_p</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">m_p: {cal.measured}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">m_p: {cal.simulated}</th>
                    <th className="text-center py-1.5 px-2 text-gray-500">Δm_p</th>
                    <th className="py-1.5 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {measuredPoints.map((pt, i) => {
                    const res = pointResults[i];
                    const dT = res ? deviationPct(res.T_out, pt.measured_T_out) : null;
                    const dW = res ? deviationPct(res.w_p * 100, pt.measured_w_p) : null;
                    const dM = res ? deviationPct(res.m_powder, pt.measured_m_powder) : null;
                    return (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 pr-3 font-medium text-gray-800">{pt.label}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{pt.measured_T_out.toFixed(1)}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{res ? res.T_out.toFixed(1) : '—'}</td>
                        <td className={`py-1.5 px-2 text-center font-mono rounded ${dT !== null ? deviationClass(dT) : ''}`}>
                          {dT !== null ? `${dT >= 0 ? '+' : ''}${dT.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{pt.measured_w_p.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{res ? (res.w_p * 100).toFixed(2) : '—'}</td>
                        <td className={`py-1.5 px-2 text-center font-mono rounded ${dW !== null ? deviationClass(dW) : ''}`}>
                          {dW !== null ? `${dW >= 0 ? '+' : ''}${dW.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{pt.measured_m_powder.toFixed(0)}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-700">{res ? res.m_powder.toFixed(0) : '—'}</td>
                        <td className={`py-1.5 px-2 text-center font-mono rounded ${dM !== null ? deviationClass(dM) : ''}`}>
                          {dM !== null ? `${dM >= 0 ? '+' : ''}${dM.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-1.5 px-2">
                          <button
                            onClick={() => setMeasuredPoints(prev => prev.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rms !== null && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-600">{cal.rmsDeviation}:</span>
                <span className={`text-xs font-bold ${deviationClass(rms).split(' ')[0]}`}>
                  {rms.toFixed(1)}%
                </span>
                {rms <= 5 && (
                  <span className="text-xs text-green-600">✓ {cal.withinTolerance}</span>
                )}
              </div>
            )}

            {/* Scatter charts: simulated vs measured */}
            {scatterT.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">{cal.fitChartTitle}: T_out</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="meas"
                      name={cal.measured}
                      label={{ value: cal.measured, position: 'insideBottom', offset: -5, fontSize: 10 }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="sim"
                      name={cal.simulated}
                      label={{ value: cal.simulated, angle: -90, position: 'insideLeft', fontSize: 10 }}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    {/* 1:1 line */}
                    <ReferenceLine segment={[{ x: 50, y: 50 }, { x: 120, y: 120 }]} stroke="#ccc" strokeDasharray="4 2" />
                    <Scatter data={scatterT} fill="#1B5E4F" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
