import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const TEACHER_TOKEN = process.env.TEACHER_TOKEN ?? 'laerer2024';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve built frontend in production
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ── SQLite ────────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'spraysim.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    student_name TEXT,
    class_code TEXT,
    role TEXT DEFAULT 'student',
    connected_at INTEGER,
    last_seen INTEGER
  );

  CREATE TABLE IF NOT EXISTS class_leaderboard (
    id TEXT PRIMARY KEY,
    class_code TEXT,
    student_name TEXT,
    session_id TEXT,
    total_score REAL,
    score_energy REAL,
    score_performance REAL,
    score_quality REAL,
    score_safety REAL,
    case_id TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS run_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    class_code TEXT,
    student_name TEXT,
    entry_json TEXT,
    timestamp INTEGER
  );
`);

// ── Prepared statements ───────────────────────────────────────────────────────
const stmtUpsertSession = db.prepare(`
  INSERT INTO sessions (id, student_name, class_code, role, connected_at, last_seen)
  VALUES (@id, @student_name, @class_code, @role, @connected_at, @last_seen)
  ON CONFLICT(id) DO UPDATE SET
    student_name = excluded.student_name,
    class_code   = excluded.class_code,
    role         = excluded.role,
    last_seen    = excluded.last_seen
`);

const stmtInsertLeaderboard = db.prepare(`
  INSERT INTO class_leaderboard
    (id, class_code, student_name, session_id, total_score, score_energy,
     score_performance, score_quality, score_safety, case_id, timestamp)
  VALUES
    (@id, @class_code, @student_name, @session_id, @total_score, @score_energy,
     @score_performance, @score_quality, @score_safety, @case_id, @timestamp)
`);

const stmtGetLeaderboard = db.prepare(`
  SELECT * FROM class_leaderboard WHERE class_code = ? ORDER BY total_score DESC LIMIT 50
`);

const stmtInsertLog = db.prepare(`
  INSERT INTO run_logs (id, session_id, class_code, student_name, entry_json, timestamp)
  VALUES (@id, @session_id, @class_code, @student_name, @entry_json, @timestamp)
`);

// ── In-memory sessions ────────────────────────────────────────────────────────
/**
 * Map: sessionId -> { ws, studentName, classCode, role, inputs, results, lastSeen }
 * @type {Map<string, {ws: import('ws').WebSocket, studentName: string, classCode: string, role: string, inputs: object, results: object, lastSeen: number}>}
 */
const activeSessions = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(ws, obj) {
  try {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(obj));
    }
  } catch {
    // ignore
  }
}

function broadcastToTeachersInClass(classCode, msg) {
  for (const [, sess] of activeSessions) {
    if (sess.classCode === classCode && sess.role === 'teacher') {
      send(sess.ws, msg);
    }
  }
}

function broadcastToClass(classCode, msg) {
  for (const [, sess] of activeSessions) {
    if (sess.classCode === classCode) {
      send(sess.ws, msg);
    }
  }
}

function buildStudentSummary(sessionId, sess) {
  const r = sess.results ?? {};
  const inp = sess.inputs ?? {};
  return {
    sessionId,
    studentName: sess.studentName,
    classCode: sess.classCode,
    lastSeen: sess.lastSeen,
    T_out: r.T_out ?? 0,
    T_main_in: inp.T_main_in ?? 0,
    RH_amb: inp.RH_amb ?? 0,
    w_p: r.w_p ?? 0,
    m_powder: r.m_powder ?? 0,
    delta_T_sticky: r.delta_T_sticky ?? 0,
    qualityIndex: r.qualityIndex ?? 0,
    safetyRisk: r.safetyRisk ?? 'low',
    stickyStatus: r.stickyStatus ?? 'safe',
  };
}

function buildClassState(classCode) {
  const students = [];
  for (const [sessionId, sess] of activeSessions) {
    if (sess.classCode === classCode && sess.role === 'student') {
      students.push(buildStudentSummary(sessionId, sess));
    }
  }
  return students;
}

// ── WebSocket handler ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  let currentSessionId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      // ── join ────────────────────────────────────────────────────────────────
      case 'join': {
        const { sessionId, studentName, classCode, role, teacherToken } = msg;

        if (role === 'teacher' && teacherToken !== TEACHER_TOKEN) {
          send(ws, { type: 'error', message: 'Ugyldig lærerkode.' });
          return;
        }

        const sid = sessionId ?? uuidv4();
        currentSessionId = sid;

        activeSessions.set(sid, {
          ws,
          studentName: studentName ?? 'Anonym',
          classCode: classCode ?? 'DEFAULT',
          role: role ?? 'student',
          inputs: {},
          results: {},
          lastSeen: Date.now(),
        });

        stmtUpsertSession.run({
          id: sid,
          student_name: studentName ?? 'Anonym',
          class_code: classCode ?? 'DEFAULT',
          role: role ?? 'student',
          connected_at: Date.now(),
          last_seen: Date.now(),
        });

        send(ws, { type: 'welcome', sessionId: sid, classCode: classCode ?? 'DEFAULT' });

        // Send teacher the current class state
        if (role === 'teacher') {
          send(ws, { type: 'class_state', students: buildClassState(classCode ?? 'DEFAULT') });
        } else {
          broadcastToTeachersInClass(classCode ?? 'DEFAULT', {
            type: 'class_state',
            students: buildClassState(classCode ?? 'DEFAULT'),
          });
        }
        break;
      }

      // ── state_update ────────────────────────────────────────────────────────
      case 'state_update': {
        const { sessionId, inputs, results } = msg;
        const sess = activeSessions.get(sessionId);
        if (!sess) break;

        sess.inputs = inputs ?? {};
        sess.results = results ?? {};
        sess.lastSeen = Date.now();

        broadcastToTeachersInClass(sess.classCode, {
          type: 'class_state',
          students: buildClassState(sess.classCode),
        });
        break;
      }

      // ── submit_score ─────────────────────────────────────────────────────────
      case 'submit_score': {
        const { sessionId, caseId, scores } = msg;
        const sess = activeSessions.get(sessionId);
        if (!sess) break;

        stmtInsertLeaderboard.run({
          id: uuidv4(),
          class_code: sess.classCode,
          student_name: sess.studentName,
          session_id: sessionId,
          total_score: scores?.totalScore ?? 0,
          score_energy: scores?.scoreEnergy ?? 0,
          score_performance: scores?.scorePerformance ?? 0,
          score_quality: scores?.scoreQuality ?? 0,
          score_safety: scores?.scoreSafety ?? 0,
          case_id: caseId ?? '',
          timestamp: Date.now(),
        });

        const leaderboard = stmtGetLeaderboard.all(sess.classCode);
        broadcastToClass(sess.classCode, { type: 'leaderboard_update', leaderboard });
        break;
      }

      // ── log_entry ────────────────────────────────────────────────────────────
      case 'log_entry': {
        const { sessionId, entry } = msg;
        const sess = activeSessions.get(sessionId);
        if (!sess) break;

        stmtInsertLog.run({
          id: uuidv4(),
          session_id: sessionId,
          class_code: sess.classCode,
          student_name: sess.studentName,
          entry_json: JSON.stringify(entry ?? {}),
          timestamp: Date.now(),
        });
        break;
      }

      // ── teacher_inject ───────────────────────────────────────────────────────
      case 'teacher_inject': {
        const { targetSessionId, inputPatch, message } = msg;
        const target = activeSessions.get(targetSessionId);
        if (!target) {
          send(ws, { type: 'error', message: `Session ${targetSessionId} ikke fundet.` });
          break;
        }
        send(target.ws, { type: 'injected_inputs', inputPatch: inputPatch ?? {}, message: message ?? '' });
        break;
      }

      // ── teacher_fault ────────────────────────────────────────────────────────
      case 'teacher_fault': {
        const { targetSessionId, faultType, faultValue, message } = msg;
        const target = activeSessions.get(targetSessionId);
        if (!target) {
          send(ws, { type: 'error', message: `Session ${targetSessionId} ikke fundet.` });
          break;
        }
        send(target.ws, { type: 'injected_fault', faultType, faultValue, message: message ?? '' });
        break;
      }

      // ── get_class_state ──────────────────────────────────────────────────────
      case 'get_class_state': {
        const { classCode } = msg;
        send(ws, { type: 'class_state', students: buildClassState(classCode ?? '') });
        break;
      }

      // ── ping ─────────────────────────────────────────────────────────────────
      case 'ping': {
        send(ws, { type: 'pong' });
        break;
      }

      default:
        send(ws, { type: 'error', message: `Ukendt beskedtype: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    if (currentSessionId) {
      const sess = activeSessions.get(currentSessionId);
      if (sess) {
        const classCode = sess.classCode;
        activeSessions.delete(currentSessionId);
        broadcastToTeachersInClass(classCode, {
          type: 'class_state',
          students: buildClassState(classCode),
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`SpraySimDK server running on http://localhost:${PORT}`);
  console.log(`Teacher token: ${TEACHER_TOKEN}`);
});
