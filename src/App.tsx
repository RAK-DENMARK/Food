import React from 'react';
import { Layout } from './components/Layout';
import { ProcessDiagram } from './components/ProcessDiagram';
import { ParameterPanel } from './components/ParameterPanel';
import { KPIPanel } from './components/KPIPanel';
import { StickyCurve } from './components/StickyCurve';
import { ScenarioComparison } from './components/ScenarioComparison';
import { CaseLibrary } from './components/CaseLibrary';
import { CalibrationPanel } from './components/CalibrationPanel';
import { Gamification } from './components/Gamification';
import { TrendChart } from './components/TrendChart';
import { MultiplayerPanel } from './components/MultiplayerPanel';
import { useSimStore } from './store/simulationStore';

function SimuleringTab() {
  return (
    // Fixed-height grid that fills the viewport below the header — no page scroll
    <div className="grid grid-cols-[1fr_320px_280px] gap-3 h-[calc(100vh-130px)]">

      {/* Col 1: P&I diagram (top) + Sticky curve (bottom) */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex-1 min-h-0 bg-white rounded-lg shadow overflow-hidden">
          <ProcessDiagram />
        </div>
        <div className="h-56 bg-white rounded-lg shadow overflow-hidden">
          <StickyCurve />
        </div>
      </div>

      {/* Col 2: Parameter panel — scrolls internally */}
      <div className="bg-white rounded-lg shadow flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-1 border-b border-gray-100">
          <h2 className="text-sm font-bold text-primary">Parametre</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <ParameterPanel />
        </div>
      </div>

      {/* Col 3: KPI panel — scrolls internally */}
      <div className="bg-white rounded-lg shadow flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-1 border-b border-gray-100">
          <h2 className="text-sm font-bold text-primary">Nøgletal (KPI)</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <KPIPanel />
        </div>
      </div>
    </div>
  );
}

function SpilLogTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div>
        <Gamification />
      </div>
      <div>
        <TrendChart />
      </div>
    </div>
  );
}

export default function App() {
  const { activeTab } = useSimStore();

  return (
    <Layout>
      {activeTab === 'simulering' && <SimuleringTab />}
      {activeTab === 'scenarieanalyse' && <ScenarioComparison />}
      {activeTab === 'cases' && <CaseLibrary />}
      {activeTab === 'kalibrering' && <CalibrationPanel />}
      {activeTab === 'spilLog' && <SpilLogTab />}
      {activeTab === 'klasse' && <MultiplayerPanel />}
    </Layout>
  );
}
