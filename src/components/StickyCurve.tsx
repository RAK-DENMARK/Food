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

  // Expand X axis so the operating point is always visible with margin
  const xMax = useMemo(() => {
    const pts = [results?.X_out ?? 0, ...snapshots.map(s => s.results.X_out)];
    return Math.max(40, ...pts.map(x => Math.ceil(x / 5) * 5 + 5));
  }, [results, snapshots]);

  const curveData = useMemo(
    () => stickyCurve(calibration, [0, xMax]),
    [calibration, xMax],
  );

  const opColor =
    results?.stickyStatus === 'safe'
      ? '#16a34a'
      : results?.stickyStatus === 'warning'
      ? '#ca8a04'
      : '#dc2626';

  const operatingPoint = results
    ? [{ X: results.X_out, T: results.T_out }]
    : [];

  return (
    <div className="bg-white rounded-lg shadow px-3 pt-2 pb-1 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-gray-700 mb-1">{t.sticky.curveTitle}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 4, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="X"
              type="number"
              domain={[0, xMax]}
              name="X"
              label={{ value: t.sticky.xAxis, position: 'insideBottom', offset: -16, fontSize: 10 }}
              tick={{ fontSize: 9 }}
            />
            <YAxis
              type="number"
              domain={[20, 220]}
              label={{ value: t.sticky.yAxis, angle: -90, position: 'insideLeft', fontSize: 10, dx: 8 }}
              tick={{ fontSize: 9 }}
            />
            <Tooltip
              formatter={(val: number) => val?.toFixed(1)}
              contentStyle={{ fontSize: 10 }}
            />

            {/* Sticky boundary curve */}
            <Line
              data={curveData}
              type="monotone"
              dataKey="T_sticky"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Klæbrighedsgrænse"
            />

            {/* Current operating point */}
            {results && (
              <Scatter
                data={operatingPoint}
                dataKey="T"
                fill={opColor}
                name="Driftspunkt"
                shape={<BigDot fill={opColor} />}
              />
            )}

            {/* Saved snapshot points */}
            {snapshots.map((s) => (
              <Scatter
                key={s.id}
                data={[{ X: s.results.X_out, T: s.results.T_out }]}
                dataKey="T"
                fill="#94a3b8"
                name={s.name}
                shape={<SmallDot />}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-400 text-center pb-0.5">
        Over kurven = klæbrig risiko
        {results && ` · Driftspunkt: X=${results.X_out.toFixed(1)} g/kg, T=${results.T_out.toFixed(1)}°C`}
      </div>
    </div>
  );
}
