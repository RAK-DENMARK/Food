import React from 'react';
import { Layout } from './components/Layout';
import { ProcessDiagram } from './components/ProcessDiagram';
import { ParameterPanel } from './components/ParameterPanel';
import { KPIPanel } from './components/KPIPanel';
import { StickyCurve } from './components/StickyCurve';
import { ScenarioComparison } from './components/ScenarioComparison';
import { CaseLibrary } from './components/CaseLibrary';
import { CalibrationPanel } from './components/CalibrationPanel';
import { useSimStore } from './store/simulationStore';

function SimuleringTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Left/Main: P&I + Sticky Curve */}
      <div className="xl:col-span-2 space-y-4">
        <ProcessDiagram />
        <StickyCurve />
      </div>
      {/* Right: Parameters + KPIs */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold text-primary mb-2">Parametre</h2>
          <ParameterPanel />
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold text-primary mb-2">Nøgletal (KPI)</h2>
          <KPIPanel />
        </div>
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
    </Layout>
  );
}
