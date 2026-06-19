import React, { useState } from 'react';
import { useSimStore } from '../store/simulationStore';
import { CASES } from '../config/cases';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { Case } from '../sim/types';

export function CaseLibrary() {
  const { loadCase, setActiveTab, language } = useSimStore();
  const t = language === 'da' ? da : en;
  const [openHints, setOpenHints] = useState<string | null>(null);

  const levelColors: Record<string, string> = {
    basic: 'bg-green-100 text-green-800 border-green-200',
    advanced: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    pro: 'bg-red-100 text-red-800 border-red-200',
  };

  const handleLoad = (c: Case) => {
    loadCase(c);
    setActiveTab('simulering');
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-primary mb-4">{t.cases.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CASES.map(c => (
          <div key={c.id} className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:border-primary-300 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800 text-sm pr-2">
                {language === 'da' ? c.titleDa : c.titleEn}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${levelColors[c.level]}`}>
                {t.cases.level[c.level]}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3 flex-1">
              {language === 'da' ? c.descriptionDa : c.descriptionEn}
            </p>
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">{t.cases.goals}:</div>
              <ul className="text-xs text-gray-600 space-y-0.5">
                {(language === 'da' ? c.goalsDa : c.goalsEn).map((g, i) => (
                  <li key={i} className="flex gap-1"><span className="text-primary-500">•</span><span>{g}</span></li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleLoad(c)}
                className="flex-1 px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-600 transition-colors"
              >
                {t.cases.load}
              </button>
              <button
                onClick={() => setOpenHints(openHints === c.id ? null : c.id)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
              >
                {openHints === c.id ? t.cases.hideHints : t.cases.showHints}
              </button>
            </div>
            {openHints === c.id && (
              <div className="mt-3 p-2.5 bg-yellow-50 rounded border border-yellow-200">
                <div className="text-xs font-semibold text-yellow-800 mb-1">{t.cases.hints}:</div>
                {c.facitHints.map((h, i) => (
                  <div key={i} className="text-xs text-yellow-700 mt-0.5">• {h}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
