import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useSimStore } from '../store/simulationStore';
import { stickyCurve } from '../sim/glassTransition';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

interface DotProps {
  cx?: number;
  cy?: number;
  fill?: string;
  r?: number;
}

function BigDot({ cx = 0, cy = 0, fill = '#000' }: DotProps) {
  return <circle cx={cx} cy={cy} r={8} fill={fill} stroke="white" strokeWidth={2} />;
}

function SmallDot({ cx = 0, cy = 0 }: DotProps) {
  return <circle cx={cx} cy={cy} r={5} fill="#94a3b8" stroke="white" strokeWidth={1} />;
}

export function StickyCurve() {
  const { results, calibration, snapshots, language } = useSimStore();
  const t = language === 'da' ? da : en;

  const curveData = useMemo(() => stickyCurve(calibration), [calibration]);

  const opColor = results?.stickyStatus === 'safe' ? '#16a34a'
    : results?.stickyStatus === 'warning' ? '#ca8a04'
    : '#dc2626';

  const operatingPoint = results
    ? [{ X: results.X_out, T_sticky: results.T_out }]
    : [];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.sticky.curveTitle}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 35, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="X"
            type="number"
            domain={[0, 20]}
            name="X"
            label={{ value: t.sticky.xAxis, position: 'insideBottom', offset: -20, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number"
            domain={[20, 200]}
            label={{ value: t.sticky.yAxis, angle: -90, position: 'insideLeft', fontSize: 11, dx: -5 }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(val: number) => val?.toFixed(1)}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

          {/* Sticky curve (boundary) */}
          <Line
            data={curveData}
            type="monotone"
            dataKey="T_sticky"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={false}
            name={t.sticky.zone}
          />

          {/* Current operating point */}
          {results && (
            <Scatter
              data={operatingPoint}
              dataKey="T_sticky"
              fill={opColor}
              name={t.sticky.operatingPoint}
              shape={<BigDot fill={opColor} />}
            />
          )}

          {/* Snapshot points */}
          {snapshots.map((s) => (
            <Scatter
              key={s.id}
              data={[{ X: s.results.X_out, T_sticky: s.results.T_out }]}
              dataKey="T_sticky"
              fill="#94a3b8"
              name={s.name}
              shape={<SmallDot />}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-400 mt-1 text-center">
        Zone over kurven = klæbrig risiko · {results && `Driftspunkt: (${results.X_out.toFixed(1)} g/kg, ${results.T_out.toFixed(1)}°C)`}
      </div>
    </div>
  );
}
