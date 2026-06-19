import React, { useState, useEffect } from 'react';
import { useSimStore } from '../store/simulationStore';
import { da } from '../i18n/da';
import { en } from '../i18n/en';
import type { StudentSummary, ServerLeaderboardEntry } from '../services/wsClient';

// ── Helper: status colour ────────────────────────────────────────────────────
function rowColor(status: string) {
  if (status === 'critical') return 'bg-red-50';
  if (status === 'warning') return 'bg-yellow-50';
  return 'bg-green-50';
}

function statusBadge(status: string) {
  if (status === 'critical') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">Kritisk</span>;
  if (status === 'warning') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Advarsel</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">OK</span>;
}

// ── Inject controls ───────────────────────────────────────────────────────────
const INJECTABLE_PARAMS = [
  { key: 'T_main_in', label: 'T_main_in (indblæsningstemperatur)' },
  { key: 'RH_amb', label: 'RH_amb (relativ luftfugtighed)' },
  { key: 'm_feed', label: 'm_feed (fødemængde)' },
  { key: 'X_main_in', label: 'X_main_in (absolut fugtighed)' },
  { key: 'T_ifb', label: 'T_ifb (IFB temperatur)' },
  { key: 'T_efb', label: 'T_efb (EFB temperatur)' },
];

const FAULT_OPTIONS = [
  { type: 'high_humidity', label: 'Forhøj luftfugtighed (forårsvejr)', value: true },
  { type: 'low_inlet_temp', label: 'Reducer indblæsningstemperatur', value: true },
  { type: 'overload_feed', label: 'Overbelast koncentratflow', value: true },
];

interface InjectControlsProps {
  targetSessionId: string;
}

function InjectControls({ targetSessionId }: InjectControlsProps) {
  const { teacherInjectParams, teacherInjectFault } = useSimStore();
  const [paramKey, setParamKey] = useState(INJECTABLE_PARAMS[0].key);
  const [paramValue, setParamValue] = useState('');
  const [paramMsg, setParamMsg] = useState('');
  const [faultType, setFaultType] = useState(FAULT_OPTIONS[0].type);

  function handleInjectParam() {
    const val = parseFloat(paramValue);
    if (isNaN(val)) return;
    teacherInjectParams(targetSessionId, { [paramKey]: val }, paramMsg);
    setParamValue('');
    setParamMsg('');
  }

  function handleInjectFault() {
    const opt = FAULT_OPTIONS.find(f => f.type === faultType);
    if (!opt) return;
    const label = opt.label;
    teacherInjectFault(targetSessionId, faultType, opt.value, label);
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
      {/* Parameter injection */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1">Injicér parametre</p>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="border rounded px-2 py-1 text-xs"
            value={paramKey}
            onChange={e => setParamKey(e.target.value)}
          >
            {INJECTABLE_PARAMS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded px-2 py-1 text-xs w-24"
            placeholder="Ny værdi"
            value={paramValue}
            onChange={e => setParamValue(e.target.value)}
          />
          <input
            type="text"
            className="border rounded px-2 py-1 text-xs w-40"
            placeholder="Besked til elev"
            value={paramMsg}
            onChange={e => setParamMsg(e.target.value)}
          />
          <button
            onClick={handleInjectParam}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
          >
            Send til elev
          </button>
        </div>
      </div>

      {/* Fault injection */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1">Injicér fejl</p>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="border rounded px-2 py-1 text-xs"
            value={faultType}
            onChange={e => setFaultType(e.target.value)}
          >
            {FAULT_OPTIONS.map(f => (
              <option key={f.type} value={f.type}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={handleInjectFault}
            className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700"
          >
            Aktiver fejl
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
function TeacherDashboard() {
  const { classStudents, classLeaderboard } = useSimStore();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  function exportCSV() {
    if (classStudents.length === 0) return;
    const headers = ['sessionId', 'studentName', 'T_main_in', 'T_out', 'RH_amb', 'w_p', 'm_powder', 'delta_T_sticky', 'qualityIndex', 'safetyRisk', 'stickyStatus'];
    const rows = classStudents.map(s =>
      headers.map(h => (s as unknown as Record<string, unknown>)[h] ?? '').join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klasse_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-gray-800">Læreroverblik</h3>
        <button
          onClick={exportCSV}
          className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-800"
        >
          Eksporter klasse-data (CSV)
        </button>
      </div>

      {/* Student sessions table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Elevsessioner ({classStudents.length} tilsluttet)</p>
        {classStudents.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ingen elever tilsluttet endnu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-left">
                  <th className="px-2 py-1 border">Navn</th>
                  <th className="px-2 py-1 border">T_in (°C)</th>
                  <th className="px-2 py-1 border">T_ud (°C)</th>
                  <th className="px-2 py-1 border">RH_amb (%)</th>
                  <th className="px-2 py-1 border">w_p (%)</th>
                  <th className="px-2 py-1 border">ΔT_sticky</th>
                  <th className="px-2 py-1 border">Kvalitet</th>
                  <th className="px-2 py-1 border">Status</th>
                  <th className="px-2 py-1 border"></th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map(s => (
                  <React.Fragment key={s.sessionId}>
                    <tr className={`${rowColor(s.stickyStatus)} border-b`}>
                      <td className="px-2 py-1 border font-medium">{s.studentName}</td>
                      <td className="px-2 py-1 border">{s.T_main_in.toFixed(0)}</td>
                      <td className="px-2 py-1 border">{s.T_out.toFixed(0)}</td>
                      <td className="px-2 py-1 border">{s.RH_amb.toFixed(0)}</td>
                      <td className="px-2 py-1 border">{s.w_p.toFixed(2)}</td>
                      <td className="px-2 py-1 border">{s.delta_T_sticky.toFixed(1)}</td>
                      <td className="px-2 py-1 border">{s.qualityIndex.toFixed(0)}</td>
                      <td className="px-2 py-1 border">{statusBadge(s.stickyStatus)}</td>
                      <td className="px-2 py-1 border">
                        <button
                          className="text-blue-600 underline text-xs"
                          onClick={() => setSelectedSession(selectedSession === s.sessionId ? null : s.sessionId)}
                        >
                          {selectedSession === s.sessionId ? 'Luk' : 'Vælg'}
                        </button>
                      </td>
                    </tr>
                    {selectedSession === s.sessionId && (
                      <tr>
                        <td colSpan={9} className="bg-gray-50 px-3 py-2 border-b">
                          <InjectControls targetSessionId={s.sessionId} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Class leaderboard */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Klassens pointtavle</p>
        {classLeaderboard.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ingen scores endnu.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600">
                <th className="px-2 py-1 border">#</th>
                <th className="px-2 py-1 border">Navn</th>
                <th className="px-2 py-1 border">Score</th>
                <th className="px-2 py-1 border">Energi</th>
                <th className="px-2 py-1 border">Output</th>
                <th className="px-2 py-1 border">Kvalitet</th>
                <th className="px-2 py-1 border">Sikkerhed</th>
              </tr>
            </thead>
            <tbody>
              {classLeaderboard.map((e: ServerLeaderboardEntry, i: number) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1 border font-bold">{i + 1}</td>
                  <td className="px-2 py-1 border">{e.student_name}</td>
                  <td className="px-2 py-1 border font-bold text-blue-700">{e.total_score?.toFixed(0)}</td>
                  <td className="px-2 py-1 border">{e.score_energy?.toFixed(0)}</td>
                  <td className="px-2 py-1 border">{e.score_performance?.toFixed(0)}</td>
                  <td className="px-2 py-1 border">{e.score_quality?.toFixed(0)}</td>
                  <td className="px-2 py-1 border">{e.score_safety?.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function MultiplayerPanel() {
  const {
    language,
    multiplayerConnected,
    multiplayerStudentName,
    multiplayerClassCode,
    multiplayerRole,
    multiplayerSessionId,
    pendingInjection,
    pendingFault,
    classLeaderboard,
    joinMultiplayer,
    leaveMultiplayer,
    dismissInjection,
    dismissFault,
  } = useSimStore();

  const t = language === 'da' ? da : en;

  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [roleInput, setRoleInput] = useState<'student' | 'teacher'>('student');
  const [tokenInput, setTokenInput] = useState('');

  function handleJoin() {
    if (!nameInput.trim() || !codeInput.trim()) return;
    joinMultiplayer(nameInput.trim(), codeInput.trim(), roleInput, roleInput === 'teacher' ? tokenInput : undefined);
  }

  // Student leaderboard (from server)
  const showLeaderboard = multiplayerConnected && multiplayerRole === 'student' && classLeaderboard.length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-primary">{t.multiplayer.joinClass}</h2>
        <span className={`w-2.5 h-2.5 rounded-full ${multiplayerConnected ? 'bg-green-500' : 'bg-red-400'}`} title={multiplayerConnected ? 'Forbundet' : 'Offline'} />
        <span className="text-xs text-gray-500">
          {multiplayerConnected
            ? `${t.multiplayer.connectedAs} ${multiplayerStudentName} ${t.multiplayer.inClass} ${multiplayerClassCode}`
            : t.multiplayer.offlineMode}
        </span>
      </div>

      {/* Pending injection notification */}
      {pendingInjection && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 rounded p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">{t.multiplayer.teacherInjectedParams}</p>
            <p className="text-xs text-yellow-700 mt-0.5">{pendingInjection.message}</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {Object.entries(pendingInjection.inputPatch).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </p>
          </div>
          <button onClick={dismissInjection} className="text-yellow-600 hover:text-yellow-800 text-xs underline">{t.multiplayer.dismiss}</button>
        </div>
      )}

      {/* Pending fault notification */}
      {pendingFault && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{t.multiplayer.teacherInjectedFault}</p>
            <p className="text-xs text-red-700 mt-0.5">{pendingFault.message}</p>
          </div>
          <button onClick={dismissFault} className="text-red-600 hover:text-red-800 text-xs underline">{t.multiplayer.dismiss}</button>
        </div>
      )}

      {/* Join form */}
      {!multiplayerConnected || !multiplayerSessionId ? (
        <div className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t.multiplayer.studentName}</label>
            <input
              type="text"
              className="border rounded px-3 py-1.5 text-sm w-full"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Dit navn"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t.multiplayer.classCode}</label>
            <input
              type="text"
              className="border rounded px-3 py-1.5 text-sm w-full"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="Klassekode (f.eks. KOLD2024)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rolle</label>
            <select
              className="border rounded px-3 py-1.5 text-sm w-full"
              value={roleInput}
              onChange={e => setRoleInput(e.target.value as 'student' | 'teacher')}
            >
              <option value="student">Elev</option>
              <option value="teacher">Lærer</option>
            </select>
          </div>
          {roleInput === 'teacher' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t.multiplayer.teacherToken}</label>
              <input
                type="password"
                className="border rounded px-3 py-1.5 text-sm w-full"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Lærerkode"
              />
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={!nameInput.trim() || !codeInput.trim()}
            className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {t.multiplayer.joinBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-700">
              <strong>{multiplayerRole === 'teacher' ? 'Lærer' : 'Elev'}:</strong> {multiplayerStudentName} · Klasse: <strong>{multiplayerClassCode}</strong>
            </p>
            <button
              onClick={leaveMultiplayer}
              className="text-xs text-red-600 underline hover:text-red-800"
            >
              Forlad
            </button>
          </div>

          {multiplayerRole === 'teacher' && <TeacherDashboard />}

          {showLeaderboard && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{t.multiplayer.classLeaderboard}</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-600">
                    <th className="px-2 py-1 border">#</th>
                    <th className="px-2 py-1 border">Navn</th>
                    <th className="px-2 py-1 border">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(classLeaderboard as ServerLeaderboardEntry[]).map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1 border font-bold">{i + 1}</td>
                      <td className="px-2 py-1 border">{e.student_name}</td>
                      <td className="px-2 py-1 border font-bold text-blue-700">{e.total_score?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
