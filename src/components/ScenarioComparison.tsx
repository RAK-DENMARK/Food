import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { SimulationResults, SimulationInputs } from '../sim/types';

const SNAPSHOT_COLORS = ['#1B5E4F', '#e74c3c', '#3498db', '#f39c12'];

type NumericResultKey = {
  [K in keyof SimulationResults]: SimulationResults[K] extends number ? K : never;
}[keyof SimulationResults];

type NumericInputKey = {
  [K in keyof SimulationInputs]: SimulationInputs[K] extends number ? K : never;
}[keyof SimulationInputs];

interface KPIRow {
  key: NumericResultKey;
  label: string;
  unit: string;
  fmt: (v: number) => string;
  higherIsBetter: boolean;
}

interface InputRow {
  key: NumericInputKey;
  label: string;
  unit: string;
}

export function ScenarioComparison() {
  const { results, snapshots, saveSnapshot, deleteSnapshot, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim() || !results) return;
    saveSnapshot(name.trim());
    setName('');
  };

  const kpiRows: KPIRow[] = [
    { key: 'T_out', label: t.kpi.T_out, unit: '°C', fmt: v => v.toFixed(1), higherIsBetter: false },
    { key: 'RH_out', label: t.kpi.RH_out, unit: '%', fmt: v => v.toFixed(1), higherIsBetter: false },
    { key: 'm_powder', label: t.kpi.m_powder, unit: 'kg/h', fmt: v => v.toFixed(0), higherIsBetter: true },
    { key: 'w_p', label: t.kpi.w_p, unit: '%', fmt: v => (v * 100).toFixed(2), higherIsBetter: false },
    { key: 'T_product', label: t.kpi.T_product, unit: '°C', fmt: v => v.toFixed(1), higherIsBetter: false },
    { key: 'qualityIndex', label: t.kpi.qualityIndex, unit: '', fmt: v => v.toFixed(0), higherIsBetter: true },
    { key: 'E_per_kg_powder', label: t.kpi.E_per_kg_powder, unit: 'kJ/kg', fmt: v => v.toFixed(0), higherIsBetter: false },
    { key: 'm_evap', label: t.kpi.m_evap, unit: 'kg/h', fmt: v => v.toFixed(0), higherIsBetter: true },
    { key: 'delta_T_sticky', label: t.kpi.delta_T_sticky, unit: '°C', fmt: v => v.toFixed(1), higherIsBetter: false },
    { key: 'X_out', label: t.kpi.X_out, unit: 'g/kg', fmt: v => v.toFixed(2), higherIsBetter: false },
  ];

  const inputRows: InputRow[] = [
    { key: 'T_main_in', label: t.params.T_main_in, unit: '°C' },
    { key: 'RH_amb', label: t.params.RH_amb, unit: '%' },
    { key: 'm_feed', label: t.params.m_feed, unit: 'kg/h' },
  ];

  // Determine best/worst per row
  function getCellClass(row: KPIRow, value: number, values: number[]) {
    if (values.length < 2) return '';
    const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values);
    const worst = row.higherIsBetter ? Math.min(...values) : Math.max(...values);
    if (value === best) return 'bg-green-100 text-green-800 font-semibold';
    if (value === worst) return 'bg-red-100 text-red-800';
    return '';
  }

  // Sticky curve background points for reference
  function generateStickyLine(n = 30): { x: number; y: number }[] {
    // Simple linear approximation of sticky boundary (X_out vs T_out)
    // Uses rough proxy: T_sticky ≈ 50 + 2*X (very simplified reference)
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = i * (20 / n);
      pts.push({ x, y: 50 + 2.5 * x });
    }
    return pts;
  }

  const stickyLine = generateStickyLine();

  // Scatter points for each snapshot
  const scatterData = snapshots.map((s, i) => ({
    name: s.name,
    color: SNAPSHOT_COLORS[i % SNAPSHOT_COLORS.length],
    data: [{ x: s.results.X_out, y: s.results.T_out, name: s.name }],
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Save snapshot */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.scenario.saveSnapshot}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t.scenario.snapshotName}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim() || !results}
            className="px-4 py-1.5 bg-primary text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-primary-600 transition-colors"
          >
            {t.scenario.saveSnapshot}
          </button>
        </div>
        {!results && <p className="text-xs text-gray-400 mt-1">Ingen simulering klar endnu.</p>}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.scenario.comparison}</h3>
        {snapshots.length === 0 ? (
          <p className="text-gray-400 text-sm">{t.scenario.noSnapshots}</p>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">KPI</th>
                {snapshots.map((s, i) => (
                  <th key={s.id} className="text-center py-2 px-3 min-w-[120px]">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: SNAPSHOT_COLORS[i % SNAPSHOT_COLORS.length] }}
                      />
                      <span className="font-semibold text-gray-800">{s.name}</span>
                    </div>
                    <div className="text-gray-400 font-normal">
                      {new Date(s.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button
                      onClick={() => deleteSnapshot(s.id)}
                      className="text-red-400 hover:text-red-600 text-xs mt-0.5"
                    >
                      {t.scenario.delete}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Input rows */}
              <tr className="bg-gray-50">
                <td colSpan={snapshots.length + 1} className="py-1 pl-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  {t.scenario.inputs}
                </td>
              </tr>
              {inputRows.map(row => (
                <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 pr-4 text-gray-600">{row.label}</td>
                  {snapshots.map(s => (
                    <td key={s.id} className="py-1.5 px-3 text-center font-mono text-gray-700">
                      {(s.inputs[row.key] as number).toFixed(0)} {row.unit}
                    </td>
                  ))}
                </tr>
              ))}
              {/* KPI rows */}
              <tr className="bg-gray-50">
                <td colSpan={snapshots.length + 1} className="py-1 pl-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  KPI
                </td>
              </tr>
              {kpiRows.map(row => {
                const values = snapshots.map(s => {
                  const v = s.results[row.key];
                  return typeof v === 'number' ? v : 0;
                });
                return (
                  <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 text-gray-600">{row.label}</td>
                    {snapshots.map((s, _si) => {
                      const rawVal = s.results[row.key];
                      const numVal = typeof rawVal === 'number' ? rawVal : 0;
                      const cls = getCellClass(row, numVal, values);
                      return (
                        <td key={s.id} className={`py-1.5 px-3 text-center font-mono rounded ${cls}`}>
                          {row.fmt(numVal)} {row.unit}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sticky curve with operating points */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {language === 'da' ? 'Klæbrighedskurve — driftspunkter' : 'Stickiness Curve — Operating Points'}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="x"
                name="X_out (g/kg)"
                domain={[0, 20]}
                label={{ value: 'X_out (g/kg)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="T_out (°C)"
                domain={[40, 120]}
                label={{ value: 'T_out (°C)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number, name: string) => [value.toFixed(1), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Sticky boundary */}
              <Scatter
                name={language === 'da' ? 'Klæbegrænse' : 'Sticky boundary'}
                data={stickyLine}
                fill="none"
                line={{ stroke: '#e74c3c', strokeWidth: 2, strokeDasharray: '6 3' }}
                shape={() => null as unknown as React.ReactElement}
              />
              {/* Operating points */}
              {scatterData.map((sd) => (
                <Scatter
                  key={sd.name}
                  name={sd.name}
                  data={sd.data}
                  fill={sd.color}
                  shape={(props: { cx?: number; cy?: number; payload?: { name: string } }) => {
                    const { cx = 0, cy = 0, payload } = props;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={7} fill={sd.color} />
                        <text x={cx + 10} y={cy - 5} fontSize={10} fill={sd.color} fontWeight="bold">
                          {payload?.name}
                        </text>
                      </g>
                    );
                  }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
