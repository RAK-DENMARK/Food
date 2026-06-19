/**
 * WebSocket client singleton for SpraySimDK multiplayer.
 * Auto-reconnects with exponential backoff. All WS calls are
 * wrapped in try/catch so the app degrades gracefully offline.
 */

export type ServerMessage =
  | { type: 'welcome'; sessionId: string; classCode: string }
  | { type: 'class_state'; students: StudentSummary[] }
  | { type: 'injected_inputs'; inputPatch: Record<string, number>; message: string }
  | { type: 'injected_fault'; faultType: string; faultValue: boolean | number; message: string }
  | { type: 'leaderboard_update'; leaderboard: ServerLeaderboardEntry[] }
  | { type: 'pong' }
  | { type: 'error'; message: string };

export type ClientMessage =
  | { type: 'join'; sessionId: string; studentName: string; classCode: string; role: 'student' | 'teacher'; teacherToken?: string }
  | { type: 'state_update'; sessionId: string; inputs: Record<string, number>; results: Record<string, unknown> }
  | { type: 'submit_score'; sessionId: string; caseId: string; scores: { totalScore: number; scoreEnergy: number; scorePerformance: number; scoreQuality: number; scoreSafety: number } }
  | { type: 'log_entry'; sessionId: string; entry: Record<string, unknown> }
  | { type: 'teacher_inject'; targetSessionId: string; inputPatch: Record<string, number>; message: string }
  | { type: 'teacher_fault'; targetSessionId: string; faultType: string; faultValue: boolean | number; message: string }
  | { type: 'get_class_state'; classCode: string }
  | { type: 'ping' };

export interface StudentSummary {
  sessionId: string;
  studentName: string;
  classCode: string;
  lastSeen: number;
  T_out: number;
  T_main_in: number;
  RH_amb: number;
  w_p: number;
  m_powder: number;
  delta_T_sticky: number;
  qualityIndex: number;
  safetyRisk: string;
  stickyStatus: string;
}

export interface ServerLeaderboardEntry {
  id: string;
  class_code: string;
  student_name: string;
  session_id: string;
  total_score: number;
  score_energy: number;
  score_performance: number;
  score_quality: number;
  score_safety: number;
  case_id: string;
  timestamp: number;
}

type MessageHandler = (msg: ServerMessage) => void;

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

class WSClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = false;
  private _connected = false;

  connect(url: string): void {
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    this._doConnect();
  }

  private _doConnect(): void {
    if (!this.url) return;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        this._connected = true;
        this.reconnectAttempt = 0;
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          this.handlers.forEach(h => h(msg));
        } catch {
          // ignore malformed messages
        }
      });

      this.ws.addEventListener('close', () => {
        this._connected = false;
        this.ws = null;
        if (this.shouldReconnect) {
          const delay = BACKOFF_DELAYS[Math.min(this.reconnectAttempt, BACKOFF_DELAYS.length - 1)];
          this.reconnectAttempt++;
          this.reconnectTimer = setTimeout(() => this._doConnect(), delay);
        }
      });

      this.ws.addEventListener('error', () => {
        // error event always followed by close, handled there
        this._connected = false;
      });
    } catch {
      // WebSocket constructor can throw in some environments
      this._connected = false;
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this._connected = false;
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      // ignore send errors
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this._connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WSClient();
