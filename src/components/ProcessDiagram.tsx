import React from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

// Live value label displayed next to a stream
function StreamLabel({
  x, y, lines, anchor = 'start', color = '#475569',
}: {
  x: number; y: number; lines: string[]; anchor?: 'start' | 'middle' | 'end'; color?: string;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * 13}
          textAnchor={anchor}
          fill={color}
          fontSize="10"
          fontFamily="monospace"
        >
          {line}
        </text>
      ))}
    </>
  );
}

export function ProcessDiagram() {
  const { results, inputs, language } = useSimStore();
  const t = language === 'da' ? da : en;

  const borderColor =
    results?.stickyStatus === 'safe'
      ? '#16a34a'
      : results?.stickyStatus === 'warning'
      ? '#ca8a04'
      : '#dc2626';

  const statusLabel = results ? t.sticky[results.stickyStatus] : '…';

  // Tower geometry
  const TX = 310; // tower left x
  const TW = 180; // tower width
  const TY = 60;  // tower top y
  const TH = 200; // cylindrical part height
  const ConeH = 80; // cone height
  const Tcx = TX + TW / 2; // tower center x
  const ConeBottomY = TY + TH + ConeH;
  const IFB_Y = ConeBottomY + 10; // IFB top

  // EFB box
  const EFB_X = 560;
  const EFB_Y = 220;
  const EFB_W = 110;
  const EFB_H = 60;

  // Cyclone (simple circle + outlet)
  const CYC_X = 560;
  const CYC_Y = 60;
  const CYC_R = 35;

  const fmt = (v: number, d = 0) => v.toFixed(d);

  return (
    <div className="w-full h-full overflow-hidden">
      <svg
        viewBox="0 0 780 430"
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        <rect width="780" height="430" fill="#f1f5f9" rx="6" />

        {/* ── Arrow markers ── */}
        <defs>
          {[
            ['arrowBlue', '#3b82f6'],
            ['arrowOrange', '#f97316'],
            ['arrowGray', '#64748b'],
            ['arrowGreen', '#10b981'],
            ['arrowPurple', '#8b5cf6'],
            ['arrowBrown', '#92400e'],
          ].map(([id, color]) => (
            <marker
              key={id}
              id={id}
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* ══════════════════════════════════════════
            MAIN DRYING CHAMBER — cylindrical + cone
        ══════════════════════════════════════════ */}

        {/* Cylinder body */}
        <rect
          x={TX} y={TY} width={TW} height={TH}
          fill="#dbeafe" stroke={borderColor} strokeWidth="2.5"
        />

        {/* Cone bottom */}
        <polygon
          points={`${TX},${TY + TH} ${TX + TW},${TY + TH} ${Tcx},${ConeBottomY}`}
          fill="#bfdbfe" stroke={borderColor} strokeWidth="2.5"
        />

        {/* Tower label */}
        <text x={Tcx} y={TY + TH * 0.38} textAnchor="middle" fill="#1e3a5f" fontSize="11" fontWeight="bold">
          SPRAYTØRRERTÅRN
        </text>
        {results && (
          <>
            <text x={Tcx} y={TY + TH * 0.55} textAnchor="middle" fill="#334155" fontSize="9.5">
              T_ud: {fmt(results.T_out, 1)} °C
            </text>
            <text x={Tcx} y={TY + TH * 0.67} textAnchor="middle" fill="#334155" fontSize="9.5">
              RH: {fmt(results.RH_out, 1)} %
            </text>
            <text x={Tcx} y={TY + TH * 0.79} textAnchor="middle" fill="#334155" fontSize="9.5">
              X_ud: {fmt(results.X_out, 1)} g/kg
            </text>
          </>
        )}

        {/* ══════════════════════
            ATOMIZER / nozzle top
        ══════════════════════ */}
        <ellipse cx={Tcx} cy={TY} rx={22} ry={8} fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
        <text x={Tcx} y={TY - 12} textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold">
          DYSER
        </text>

        {/* ══════════════════════════
            FEED / CONCENTRATE (top)
        ══════════════════════════ */}
        {/* Pipe: left → atomizer top */}
        <path
          d={`M 120 30 L ${Tcx - 22} 30 L ${Tcx - 22} ${TY}`}
          fill="none" stroke="#f97316" strokeWidth="2.5"
          markerEnd="url(#arrowOrange)"
        />
        <circle cx="120" cy="30" r="6" fill="#f97316" />
        {/* Label — safely above */}
        <text x="20" y="18" fill="#ea580c" fontSize="11" fontWeight="bold">KONCENTRAT</text>
        <text x="20" y="30" fill="#64748b" fontSize="9">
          {results
            ? `${fmt(results.m_powder + results.m_evap, 0)} kg/h  ·  ${(inputs.x_ds * 100).toFixed(0)}% TS`
            : '– kg/h'}
        </text>
        <text x="20" y="42" fill="#64748b" fontSize="9">{inputs.T_feed} °C</text>

        {/* ══════════════════════════
            MAIN HOT AIR (left side)
        ══════════════════════════ */}
        <line
          x1="60" y1="140" x2={TX} y2="140"
          stroke="#3b82f6" strokeWidth="2.5"
          markerEnd="url(#arrowBlue)"
        />
        <circle cx="60" cy="140" r="6" fill="#3b82f6" />
        <text x="10" y="127" fill="#2563eb" fontSize="10" fontWeight="bold">HOVED</text>
        <text x="10" y="139" fill="#2563eb" fontSize="10" fontWeight="bold">LUFT</text>
        <text x="10" y="151" fill="#64748b" fontSize="9">{inputs.T_main_in} °C</text>
        <text x="10" y="162" fill="#64748b" fontSize="9">{inputs.X_main_in} g/kg</text>

        {/* ══════════════════════════
            IFB — bottom of cone
        ══════════════════════════ */}
        {/* IFB box below cone */}
        <rect
          x={Tcx - 50} y={IFB_Y} width="100" height="38"
          fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2"
          rx="4"
        />
        <text x={Tcx} y={IFB_Y + 14} textAnchor="middle" fill="#7c3aed" fontSize="9.5" fontWeight="bold">
          IFB
        </text>
        <text x={Tcx} y={IFB_Y + 27} textAnchor="middle" fill="#6d28d9" fontSize="9">
          {inputs.T_ifb} °C
        </text>

        {/* IFB air inlet arrow (from below) */}
        <line
          x1={Tcx} y1={IFB_Y + 38 + 30}
          x2={Tcx} y2={IFB_Y + 38 + 1}
          stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrowPurple)"
        />
        <text x={Tcx} y={IFB_Y + 38 + 42} textAnchor="middle" fill="#8b5cf6" fontSize="9">
          IFB luft {inputs.m_ifb / 1000} t/h
        </text>

        {/* ══════════════════════════
            POWDER OUTLET from IFB
        ══════════════════════════ */}
        <line
          x1={Tcx + 50} y1={IFB_Y + 19}
          x2={Tcx + 50 + 80} y2={IFB_Y + 19}
          stroke="#92400e" strokeWidth="2.5"
          markerEnd="url(#arrowBrown)"
        />
        <text x={Tcx + 140} y={IFB_Y + 15} fill="#92400e" fontSize="10" fontWeight="bold">PULVER</text>
        {results && (
          <>
            <text x={Tcx + 140} y={IFB_Y + 27} fill="#64748b" fontSize="9">
              {fmt(results.m_powder, 0)} kg/h
            </text>
            <text x={Tcx + 140} y={IFB_Y + 39} fill="#64748b" fontSize="9">
              Fugt: {fmt(results.w_p * 100, 2)} %
            </text>
          </>
        )}

        {/* ══════════════════════════════
            EXHAUST AIR → CYCLONE (top)
        ══════════════════════════════ */}
        {/* Exhaust duct from tower top to cyclone */}
        <path
          d={`M ${TX + TW} ${TY + 30} L ${CYC_X - CYC_R} ${TY + 30}`}
          fill="none" stroke="#64748b" strokeWidth="2.5"
          markerEnd="url(#arrowGray)"
        />

        {/* Cyclone body */}
        <ellipse cx={CYC_X} cy={CYC_Y + CYC_R} rx={CYC_R} ry={CYC_R * 0.4} fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        <polygon
          points={`${CYC_X - CYC_R},${CYC_Y + CYC_R} ${CYC_X + CYC_R},${CYC_Y + CYC_R} ${CYC_X},${CYC_Y + CYC_R * 3}`}
          fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5"
        />
        <text x={CYC_X} y={CYC_Y + CYC_R - 4} textAnchor="middle" fill="#334155" fontSize="9" fontWeight="bold">
          CYKLON
        </text>

        {/* Exhaust out from cyclone top */}
        <line
          x1={CYC_X} y1={CYC_Y + CYC_R - 14}
          x2={CYC_X} y2={CYC_Y - 28}
          stroke="#64748b" strokeWidth="2.5"
          markerEnd="url(#arrowGray)"
        />
        <text x={CYC_X} y={CYC_Y - 32} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">
          UDBLÆSNING
        </text>
        {results && (
          <StreamLabel
            x={CYC_X + 8}
            y={CYC_Y - 20}
            lines={[
              `${fmt(results.T_out, 1)} °C`,
              `${fmt(results.X_out, 1)} g/kg`,
              `RH ${fmt(results.RH_out, 1)} %`,
            ]}
            color="#475569"
          />
        )}

        {/* Cyclone powder drop */}
        <line
          x1={CYC_X} y1={CYC_Y + CYC_R * 3}
          x2={CYC_X} y2={CYC_Y + CYC_R * 3 + 25}
          stroke="#92400e" strokeWidth="2"
          markerEnd="url(#arrowBrown)"
        />

        {/* ══════════════════════════
            EFB (external fluid bed)
        ══════════════════════════ */}
        {/* Pipe from cyclone bottom → EFB */}
        <path
          d={`M ${CYC_X} ${CYC_Y + CYC_R * 3 + 25} L ${CYC_X} ${EFB_Y - 1}`}
          fill="none" stroke="#92400e" strokeWidth="2"
          markerEnd="url(#arrowBrown)"
        />

        <rect
          x={EFB_X} y={EFB_Y} width={EFB_W} height={EFB_H}
          fill="#d1fae5" stroke="#10b981" strokeWidth="2" rx="4"
        />
        <text x={EFB_X + EFB_W / 2} y={EFB_Y + 20} textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="bold">
          EFB
        </text>
        <text x={EFB_X + EFB_W / 2} y={EFB_Y + 34} textAnchor="middle" fill="#047857" fontSize="9">
          {inputs.T_efb} °C  ·  {inputs.m_efb / 1000} t/h
        </text>

        {/* EFB air inlet from below */}
        <line
          x1={EFB_X + EFB_W / 2} y1={EFB_Y + EFB_H + 28}
          x2={EFB_X + EFB_W / 2} y2={EFB_Y + EFB_H + 1}
          stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)"
        />
        <text
          x={EFB_X + EFB_W / 2} y={EFB_Y + EFB_H + 40}
          textAnchor="middle" fill="#10b981" fontSize="9"
        >
          EFB luft
        </text>

        {/* EFB powder outlet */}
        <line
          x1={EFB_X + EFB_W} y1={EFB_Y + EFB_H / 2}
          x2={EFB_X + EFB_W + 50} y2={EFB_Y + EFB_H / 2}
          stroke="#92400e" strokeWidth="2.5"
          markerEnd="url(#arrowBrown)"
        />
        <text x={EFB_X + EFB_W + 55} y={EFB_Y + EFB_H / 2 - 4} fill="#92400e" fontSize="10" fontWeight="bold">
          PRODUKT
        </text>
        {results && (
          <text x={EFB_X + EFB_W + 55} y={EFB_Y + EFB_H / 2 + 9} fill="#64748b" fontSize="9">
            {fmt(results.T_product, 1)} °C
          </text>
        )}

        {/* ══════════════════════════
            STATUS BADGE
        ══════════════════════════ */}
        <rect
          x="10" y="185" width="145" height="52"
          rx="5" fill={borderColor} fillOpacity="0.1"
          stroke={borderColor} strokeWidth="1.5"
        />
        <text x="82" y="203" textAnchor="middle" fill={borderColor} fontSize="10" fontWeight="bold">
          {statusLabel.toUpperCase()}
        </text>
        {results && (
          <>
            <text x="82" y="218" textAnchor="middle" fill={borderColor} fontSize="10">
              ΔT klæb: {fmt(results.delta_T_sticky, 1)} °C
            </text>
            <text x="82" y="230" textAnchor="middle" fill="#64748b" fontSize="9">
              Pulvertemp: {fmt(results.T_product, 1)} °C
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
