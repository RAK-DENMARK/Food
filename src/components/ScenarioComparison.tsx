import React, { useState } from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { SimulationResults } from '../sim/types';

export function ScenarioComparison() {
  const { results, snapshots, saveSnapshot, deleteSnapshot, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim() || !results) return;
    saveSnapshot(name.trim());
    setName('');
  };

  type KPIRow = {
    key: keyof SimulationResults;
    label: string;
    unit: string;
    fmt: (v: number) => string;
  };

  const kpiRows: KPIRow[] = [
    { key: 'T_out', label: t.kpi.T_out, unit: '°C', fmt: v => v.toFixed(1) },
    { key: 'X_out', label: t.kpi.X_out, unit: 'g/kg', fmt: v => v.toFixed(2) },
    { key: 'RH_out', label: t.kpi.RH_out, unit: '%', fmt: v => v.toFixed(1) },
    { key: 'm_powder', label: t.kpi.m_powder, unit: 'kg/h', fmt: v => v.toFixed(0) },
    { key: 'w_p', label: t.kpi.w_p, unit: '%', fmt: v => (v * 100).toFixed(2) },
    { key: 'T_product', label: t.kpi.T_product, unit: '°C', fmt: v => v.toFixed(1) },
    { key: 'qualityIndex', label: t.kpi.qualityIndex, unit: '', fmt: v => v.toFixed(0) },
    { key: 'E_per_kg_powder', label: t.kpi.E_per_kg_powder, unit: 'kJ/kg', fmt: v => v.toFixed(0) },
    { key: 'delta_T_sticky', label: t.kpi.delta_T_sticky, unit: '°C', fmt: v => v.toFixed(1) },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.scenario.comparison}</h3>
        {snapshots.length === 0 ? (
          <p className="text-gray-400 text-sm">{t.scenario.noSnapshots}</p>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">KPI</th>
                {snapshots.map(s => (
                  <th key={s.id} className="text-center py-2 px-3 min-w-[120px]">
                    <div className="font-semibold text-gray-800">{s.name}</div>
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
              {kpiRows.map(row => (
                <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 pr-4 text-gray-600">{row.label}</td>
                  {snapshots.map(s => {
                    const rawVal = s.results[row.key];
                    const numVal = typeof rawVal === 'number' ? rawVal : 0;
                    return (
                      <td key={s.id} className="py-1.5 px-3 text-center font-mono text-gray-800">
                        {row.fmt(numVal)} {row.unit}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
