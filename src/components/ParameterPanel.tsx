import React, { useState } from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { SimulationInputs } from '../sim/types';

interface SliderProps {
  label: string;
  unit: string;
  paramKey: keyof SimulationInputs;
  min: number;
  max: number;
  step?: number;
}

function ParamSlider({ label, unit, paramKey, min, max, step = 1 }: SliderProps) {
  const { inputs, setInput } = useSimStore();
  const value = inputs[paramKey] as number;
  const display = typeof value === 'number'
    ? (step < 0.1 ? value.toFixed(3) : step < 1 ? value.toFixed(1) : value.toString())
    : String(value);

  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-0.5">
        <label className="text-xs text-gray-700 truncate pr-2">{label}</label>
        <span className="text-xs font-mono font-semibold text-primary-700 whitespace-nowrap">
          {display} {unit}
        </span>
      </div>
      <div className="flex gap-1.5 items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => setInput(paramKey, parseFloat(e.target.value))}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setInput(paramKey, v);
          }}
          className="w-18 text-xs border border-gray-300 rounded px-1 py-0.5 text-right w-16"
        />
      </div>
    </div>
  );
}

interface GroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ParamGroup({ title, children, defaultOpen = true }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 transition-colors"
      >
        {title}
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

export function ParameterPanel() {
  const { language } = useSimStore();
  const t = language === 'da' ? da : en;
  const p = t.params;

  return (
    <div className="overflow-y-auto">
      <ParamGroup title={p.environment}>
        <ParamSlider label={p.T_amb} unit="°C" paramKey="T_amb" min={-10} max={40} />
        <ParamSlider label={p.RH_amb} unit="%" paramKey="RH_amb" min={10} max={100} />
      </ParamGroup>

      <ParamGroup title={p.feed}>
        <ParamSlider label={p.m_feed} unit="kg/h" paramKey="m_feed" min={1000} max={20000} step={100} />
        <ParamSlider label={p.x_ds} unit="" paramKey="x_ds" min={0.30} max={0.65} step={0.01} />
        <ParamSlider label={p.T_feed} unit="°C" paramKey="T_feed" min={40} max={90} />
      </ParamGroup>

      <ParamGroup title={p.mainAir}>
        <ParamSlider label={p.m_main_air} unit="kg/h" paramKey="m_main_air" min={30000} max={200000} step={1000} />
        <ParamSlider label={p.T_main_in} unit="°C" paramKey="T_main_in" min={120} max={250} />
        <ParamSlider label={p.X_main_in} unit="g/kg" paramKey="X_main_in" min={1} max={20} step={0.5} />
      </ParamGroup>

      <ParamGroup title={p.fluidBeds} defaultOpen={false}>
        <ParamSlider label={p.m_ifb} unit="kg/h" paramKey="m_ifb" min={5000} max={80000} step={500} />
        <ParamSlider label={p.T_ifb} unit="°C" paramKey="T_ifb" min={30} max={100} />
        <ParamSlider label={p.X_ifb} unit="g/kg" paramKey="X_ifb" min={1} max={15} step={0.5} />
        <ParamSlider label={p.m_efb} unit="kg/h" paramKey="m_efb" min={2000} max={40000} step={500} />
        <ParamSlider label={p.T_efb} unit="°C" paramKey="T_efb" min={5} max={50} />
        <ParamSlider label={p.X_efb} unit="g/kg" paramKey="X_efb" min={1} max={15} step={0.5} />
      </ParamGroup>

      <ParamGroup title={p.nozzles} defaultOpen={false}>
        <ParamSlider label={p.nozzlePressure} unit="bar" paramKey="nozzlePressure" min={50} max={400} step={10} />
        <ParamSlider label={p.nozzleCount} unit="" paramKey="nozzleCount" min={1} max={8} />
        <ParamSlider label={p.homogenPressure1} unit="bar" paramKey="homogenPressure1" min={0} max={300} step={5} />
        <ParamSlider label={p.homogenPressure2} unit="bar" paramKey="homogenPressure2" min={0} max={100} step={5} />
      </ParamGroup>

      <ParamGroup title={p.additives} defaultOpen={false}>
        <ParamSlider label={p.lecithin} unit="kg/h" paramKey="lecithin" min={0} max={50} step={1} />
        <ParamSlider label={p.co2} unit="kg/h" paramKey="co2" min={0} max={20} step={0.5} />
      </ParamGroup>
    </div>
  );
}
