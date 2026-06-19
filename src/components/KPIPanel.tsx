import React from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  colorClass?: string;
}

function KPICard({ label, value, unit = '', colorClass = 'text-gray-800' }: KPICardProps) {
  return (
    <div className="bg-gray-50 rounded border border-gray-200 p-2">
      <div className="text-xs text-gray-500 truncate leading-tight">{label}</div>
      <div className={`font-bold text-sm ${colorClass}`}>
        {value} <span className="text-xs font-normal text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="col-span-2 text-xs font-bold uppercase tracking-wide text-primary-700 mt-2 mb-0.5 border-b border-primary-100 pb-0.5">
      {title}
    </div>
  );
}

export function KPIPanel() {
  const { results, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const k = t.kpi;

  if (!results) {
    return <div className="p-4 text-gray-400 text-sm">Beregner...</div>;
  }

  const stickyClass = results.stickyStatus === 'safe' ? 'text-green-700'
    : results.stickyStatus === 'warning' ? 'text-yellow-700'
    : 'text-red-700';

  const safetyClass = results.safetyRisk === 'low' ? 'text-green-700'
    : results.safetyRisk === 'medium' ? 'text-yellow-700'
    : 'text-red-700';

  const qualityClass = results.qualityIndex > 70 ? 'text-green-700'
    : results.qualityIndex > 40 ? 'text-yellow-700'
    : 'text-red-700';

  const moistureClass = results.w_p < 0.04 ? 'text-green-700'
    : results.w_p < 0.05 ? 'text-yellow-700'
    : 'text-red-700';

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Section title={k.powder} />
      <KPICard label={k.m_powder} value={results.m_powder.toFixed(0)} unit="kg/h" />
      <KPICard label={k.w_p} value={(results.w_p * 100).toFixed(2)} unit="%" colorClass={moistureClass} />
      <KPICard label={k.T_product} value={results.T_product.toFixed(1)} unit="°C" />
      <KPICard label={k.ISi} value={results.ISi.toFixed(2)} unit="mL" />
      <KPICard label={k.qualityIndex} value={results.qualityIndex.toFixed(0)} unit="/100" colorClass={qualityClass} />

      <Section title={k.exhaust} />
      <KPICard label={k.T_out} value={results.T_out.toFixed(1)} unit="°C" />
      <KPICard label={k.X_out} value={results.X_out.toFixed(2)} unit="g/kg" />
      <KPICard label={k.RH_out} value={results.RH_out.toFixed(1)} unit="%" />

      <Section title={k.energy} />
      <KPICard label={k.Q_input} value={results.Q_input.toFixed(0)} unit="kW" />
      <KPICard label={k.E_per_kg_powder} value={results.E_per_kg_powder.toFixed(0)} unit="kJ/kg" />
      <KPICard label={k.m_evap} value={results.m_evap.toFixed(0)} unit="kg/h" />
      <KPICard label={k.towerUtilization} value={(results.towerUtilization * 100).toFixed(1)} unit="%" />

      <Section title={k.stickiness} />
      <KPICard label={k.Tg_mix} value={results.Tg_mix.toFixed(1)} unit="°C" />
      <KPICard label={k.T_sticky} value={results.T_sticky.toFixed(1)} unit="°C" />
      <KPICard label={k.delta_T_sticky} value={results.delta_T_sticky.toFixed(1)} unit="°C" colorClass={stickyClass} />
      <div className={`col-span-2 text-xs font-semibold px-2 py-1 rounded ${
        results.stickyStatus === 'safe' ? 'bg-green-100 text-green-800' :
        results.stickyStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {t.sticky[results.stickyStatus]}
      </div>

      <Section title={k.safety} />
      <div className="col-span-2">
        <div className={`text-xs font-semibold ${safetyClass}`}>
          {t.safety.label}: {t.safety[results.safetyRisk]}
        </div>
        {results.safetyFactors.map((f, i) => (
          <div key={i} className="text-xs text-gray-600 mt-0.5">• {f}</div>
        ))}
        {results.safetyFactors.length === 0 && (
          <div className="text-xs text-green-600 mt-0.5">Ingen risikofaktorer identificeret</div>
        )}
      </div>
    </div>
  );
}
