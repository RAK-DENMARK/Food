import React from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { language, setLanguage, activeTab, setActiveTab } = useSimStore();
  const t = language === 'da' ? da : en;

  const tabs = [
    { id: 'simulering', label: t.tabs.simulering },
    { id: 'scenarieanalyse', label: t.tabs.scenarieanalyse },
    { id: 'cases', label: t.tabs.cases },
    { id: 'kalibrering', label: t.tabs.kalibrering },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-white shadow-md">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.appTitle}</h1>
            <p className="text-xs opacity-75">{t.appSubtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('da')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                language === 'da' ? 'bg-white text-primary-600' : 'text-white border border-white/40 hover:bg-primary-600'
              }`}
            >
              DA
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                language === 'en' ? 'bg-white text-primary-600' : 'text-white border border-white/40 hover:bg-primary-600'
              }`}
            >
              EN
            </button>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-50 text-primary-700'
                  : 'text-white hover:bg-primary-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      <footer className="bg-yellow-50 border-t border-yellow-200 py-2 px-4 text-center">
        <p className="text-xs text-yellow-800">⚠️ {t.disclaimer}</p>
      </footer>
    </div>
  );
}
