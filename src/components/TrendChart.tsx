import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

const KPI_OPTIONS = [
  { key: 'T_out', label: 'T_out (°C)', color: '#e74c3c', refVal: null },
  { key: 'RH_out', label: 'RH_out (%)', color: '#3498db', refVal: null },
  { key: 'w_p', label: 'w_p (%wb)', color: '#2ecc71', refVal: 0.04, refLabel: 'w_p=4%' },
  { key: 'delta_T_sticky', label: 'ΔT_sticky (°C)', color: '#e67e22', refVal: 0, refLabel: 'Fouling linje' },
  { key: 'qualityIndex', label: 'Kvalitet (0-100)', color: '#9b59b6', refVal: 40, refLabel: 'Min. kvalitet' },
  { key: 'E_per_kg_powder', label: 'E/kg pulver (kJ/kg)', color: '#1abc9c', refVal: null },
] as const;

type KpiKey = typeof KPI_OPTIONS[number]['key'];

// LoggingController: manages setInterval for logging
function LoggingController() {
  const { isLogging, logInterval, appendLogEntry } = useSimStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLogging) {
      // Append immediately on start
      appendLogEntry();
      intervalRef.current = setInterval(() => {
        appendLogEntry();
      }, logInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLogging, logInterval]);

  return null;
}

export function TrendChart() {
  const { runLog, isLogging, startLogging, stopLogging, clearLog, exportLogCSV, exportLogJSON, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const tl = t.logging;
  const [selectedKPIs, setSelectedKPIs] = useState<Set<KpiKey>>(new Set(['T_out', 'delta_T_sticky', 'qualityIndex']));

  const toggleKPI = (key: KpiKey) => {
    setSelectedKPIs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Format log data: scale w_p to %
  const chartData = runLog.map(entry => ({
    ...entry,
    w_p: entry.w_p * 100, // convert fraction to %
  }));

  const activeKPIs = KPI_OPTIONS.filter(k => selectedKPIs.has(k.key));

  return (
    <div className="space-y-4">
      <LoggingController />

      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-primary">{tl.title}</h2>
        {isLogging && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {tl.loggingActive}
          </span>
        )}
        {runLog.length > 0 && (
          <span className="text-xs text-gray-500">{tl.loggedEntries}: {runLog.length}</span>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-3 flex flex-wrap gap-2">
        {!isLogging ? (
          <button
            onClick={startLogging}
            className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
          >
            ▶ {tl.startLogging}
          </button>
        ) : (
          <button
            onClick={stopLogging}
            className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            ■ {tl.stopLogging}
          </button>
        )}
        <button
          onClick={clearLog}
          disabled={runLog.length === 0}
          className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {tl.clearLog}
        </button>
        <button
          onClick={exportLogCSV}
          disabled={runLog.length === 0}
          className="px-4 py-1.5 border border-primary text-primary rounded text-sm hover:bg-primary-50 disabled:opacity-50 transition-colors"
        >
          {tl.exportCSV}
        </button>
        <button
          onClick={exportLogJSON}
          disabled={runLog.length === 0}
          className="px-4 py-1.5 border border-primary text-primary rounded text-sm hover:bg-primary-50 disabled:opacity-50 transition-colors"
        >
          {tl.exportJSON}
        </button>
      </div>

      {/* KPI selector */}
      <div className="bg-white rounded-lg shadow p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">{tl.selectKPIs}</p>
        <div className="flex flex-wrap gap-2">
          {KPI_OPTIONS.map(k => (
            <label key={k.key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedKPIs.has(k.key)}
                onChange={() => toggleKPI(k.key)}
                className="accent-primary"
              />
              <span className="text-xs text-gray-700" style={{ borderBottom: `2px solid ${k.color}` }}>
                {k.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-4">
        {runLog.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{tl.noData}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="t_elapsed_s"
                label={{ value: tl.timeAxis, position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                labelFormatter={v => `t=${v}s`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeKPIs.map(k => (
                <Line
                  key={k.key}
                  type="monotone"
                  dataKey={k.key}
                  name={k.label}
                  stroke={k.color}
                  strokeWidth={2}
                  dot={runLog.length < 20}
                  isAnimationActive={false}
                />
              ))}
              {/* Reference lines for thresholds */}
              {activeKPIs.filter(k => k.refVal !== null).map(k => (
                <ReferenceLine
                  key={`ref-${k.key}`}
                  y={k.refVal as number}
                  stroke={k.color}
                  strokeDasharray="6 3"
                  strokeOpacity={0.7}
                  label={{ value: (k as { refLabel?: string }).refLabel || '', fontSize: 10, fill: k.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
