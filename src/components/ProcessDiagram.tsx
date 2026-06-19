import React from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

export function ProcessDiagram() {
  const { results, language } = useSimStore();
  const t = language === 'da' ? da : en;

  const borderColor = results
    ? results.stickyStatus === 'safe' ? '#16a34a'
    : results.stickyStatus === 'warning' ? '#ca8a04'
    : '#dc2626'
    : '#6b7280';

  const statusLabel = results ? t.sticky[results.stickyStatus] : '...';

  return (
    <div className="bg-white rounded-lg shadow p-3 overflow-x-auto">
      <svg viewBox="0 0 800 460" className="w-full max-w-2xl mx-auto" style={{ minWidth: 360 }}>
        <rect width="800" height="460" fill="#f8fafc" rx="8" />

        {/* Drying chamber */}
        <rect x="280" y="120" width="240" height="220" fill="#e0f2fe" stroke={borderColor} strokeWidth="3" rx="8" />
        <text x="400" y="215" textAnchor="middle" fill="#1e3a5f" fontSize="14" fontWeight="bold">TØRRERTÅRN</text>
        <text x="400" y="235" textAnchor="middle" fill="#475569" fontSize="11">
          {results ? `T_ud: ${results.T_out.toFixed(1)}°C` : '...'}
        </text>
        <text x="400" y="252" textAnchor="middle" fill="#475569" fontSize="11">
          {results ? `RH: ${results.RH_out.toFixed(1)}%` : '...'}
        </text>
        <text x="400" y="269" textAnchor="middle" fill="#475569" fontSize="11">
          {results ? `X_ud: ${results.X_out.toFixed(1)} g/kg` : '...'}
        </text>

        {/* Feed pipe (top-left → chamber) */}
        <line x1="110" y1="80" x2="290" y2="165" stroke="#f97316" strokeWidth="3" />
        <circle cx="110" cy="80" r="7" fill="#f97316" />
        <text x="60" y="68" fill="#f97316" fontSize="12" fontWeight="bold">KONCENTRAT</text>
        <text x="60" y="82" fill="#64748b" fontSize="10">
          {results ? `${results.m_evap.toFixed(0)+Number(results.m_powder.toFixed(0))} kg/h` : ''}
        </text>

        {/* Main air inlet arrow */}
        <defs>
          <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
          </marker>
          <marker id="arrowPurple" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6" />
          </marker>
        </defs>
        <line x1="70" y1="230" x2="278" y2="230" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowBlue)" />
        <circle cx="70" cy="230" r="7" fill="#3b82f6" />
        <text x="35" y="215" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">HOVED</text>
        <text x="35" y="228" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">LUFT</text>
        <text x="35" y="242" fill="#64748b" fontSize="9" textAnchor="middle">
          {results ? `${results.T_out > 0 ? '→' : ''} ` : ''}180°C
        </text>

        {/* IFB from bottom */}
        <line x1="360" y1="442" x2="360" y2="342" stroke="#8b5cf6" strokeWidth="3" markerEnd="url(#arrowPurple)" />
        <circle cx="360" cy="448" r="7" fill="#8b5cf6" />
        <text x="360" y="458" fill="#8b5cf6" fontSize="11" fontWeight="bold" textAnchor="middle">IFB</text>

        {/* EFB from right */}
        <line x1="735" y1="255" x2="522" y2="255" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowGreen)" />
        <circle cx="735" cy="255" r="7" fill="#10b981" />
        <text x="753" y="250" fill="#10b981" fontSize="11" fontWeight="bold">EFB</text>
        <text x="753" y="263" fill="#64748b" fontSize="9">12°C</text>

        {/* Exhaust outlet (top) */}
        <line x1="400" y1="120" x2="400" y2="25" stroke="#94a3b8" strokeWidth="3" />
        <polygon points="400,12 393,26 407,26" fill="#94a3b8" />
        <text x="400" y="9" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">UDBLÆSNING</text>
        {results && (
          <text x="440" y="55" fill="#64748b" fontSize="10">{results.T_out.toFixed(1)}°C | {results.X_out.toFixed(1)} g/kg</text>
        )}

        {/* Powder outlet (bottom) */}
        <line x1="440" y1="340" x2="440" y2="445" stroke="#92400e" strokeWidth="3" />
        <circle cx="440" cy="449" r="7" fill="#92400e" />
        <text x="440" y="458" fill="#92400e" fontSize="11" fontWeight="bold" textAnchor="middle">PULVER</text>
        {results && (
          <text x="480" y="395" fill="#64748b" fontSize="9">
            {results.m_powder.toFixed(0)} kg/h | {(results.w_p * 100).toFixed(1)}%
          </text>
        )}

        {/* Sticky status badge */}
        <rect x="575" y="115" width="175" height="55" rx="6" fill={borderColor} fillOpacity="0.12" stroke={borderColor} strokeWidth="1.5" />
        <text x="662" y="138" textAnchor="middle" fill={borderColor} fontSize="11" fontWeight="bold">
          {statusLabel}
        </text>
        {results && (
          <text x="662" y="157" textAnchor="middle" fill={borderColor} fontSize="10">
            ΔT = {results.delta_T_sticky.toFixed(1)}°C
          </text>
        )}
      </svg>
    </div>
  );
}
