/**
 * TypeScript mirror of the backend's Pydantic models (app/schemas.py, v2).
 * The backend is the source of truth — do NOT "improve" shapes here.
 * Field names intentionally keep the wire snake_case.
 */

export type HabitStatus = "pending" | "completed" | "skipped";

export interface Habit {
  id: string;
  title: string;
  minutes: number;
  deadline_at: string; // ISO-8601, UTC
  penalty_cents: number;
  status: HabitStatus; // schemas.py types this as plain str; the API only emits these three
}

export type SessionState = "awaiting_plea" | "awaiting_rebuttal" | "resolved";

export interface ProsecutorResponse {
  objection: string; // ≤280
  challenge: string; // ≤500
  question: string; // ≤280
  emotion: string; // open vocab: idle|objection|angry|smug|condemning + fallbacks
}

export interface SessionSummary {
  id: string;
  state: SessionState;
  habit_id: string | null;
  prosecutor: ProsecutorResponse | null;
}

export interface TodayResponse {
  habit: Habit;
  habits: Habit[];
  session: SessionSummary | null;
}

export interface HabitCreate {
  title: string; // 1..120
  minutes?: number; // 1..600, default 30
  penalty_cents?: number; // 0..100000, default 200
  deadline_at?: string; // ISO-8601; server defaults to 23:59 UTC today
}

export interface SkipResponse {
  session_id: string;
  state: SessionState;
  created: boolean;
}

export type VerdictKind = "accepted" | "rejected";

export type ExcuseCategory =
  | "ordinary"
  | "health"
  | "safety"
  | "emergency"
  | "disability"
  | "caregiving"
  | "injection";

export interface JudgeVerdict {
  verdict: VerdictKind;
  reasoning: string; // ≤500, Persian from the LLM
  fine_multiplier: 0 | 1 | 1.5 | 2;
  should_rule: boolean;
  judge_emotion: string; // open vocab: neutral|verdict|stern|angry + fallbacks
  evidence_required: boolean;
  excuse_category: ExcuseCategory;
}

export interface Fine {
  id: string;
  amount_cents: number;
  reason: string; // English server constant — displayed as-is (court record)
  created_at: string;
  status: "recorded";
}

export type CourtSource = "live" | "fallback" | "absentia";

export interface PleaResponse {
  session_id: string;
  state: "awaiting_rebuttal";
  repeated: boolean;
  prosecutor: ProsecutorResponse;
  source: Exclude<CourtSource, "absentia">;
}

export interface ContinuingRebuttalResponse {
  session_id: string;
  state: "awaiting_rebuttal";
  should_rule: false;
  prosecutor: ProsecutorResponse;
  source: Exclude<CourtSource, "absentia">;
}

export interface ResolvedRebuttalResponse {
  session_id: string;
  state: "resolved";
  should_rule: true;
  verdict: JudgeVerdict;
  fine: Fine;
  source: CourtSource;
}

export type RebuttalResponse = ContinuingRebuttalResponse | ResolvedRebuttalResponse;

export interface LedgerResponse {
  balance_cents: number;
  entries: Fine[];
}

export interface HistoryDay {
  date: string; // UTC "YYYY-MM-DD" bucket — see utils/jalali.ts limitation note
  total: number;
  completed: number;
  skipped: number;
  fine_cents: number;
}

export interface HistoryResponse {
  days: HistoryDay[];
}

/** Text bodies for /court/*: 1..600 chars (TextSubmission). */
export const TEXT_SUBMISSION_MAX = 600;
/** Habit title limit (HabitCreate.title). */
export const HABIT_TITLE_MAX = 120;
/** Server-side docket cap (main.py MAX_HABITS_PER_DAY). */
export const MAX_HABITS_PER_DAY = 20;

/** The full client surface — one method per backend route. */
export interface ObjectionApi {
  health(): Promise<{ status: string }>;
  getToday(): Promise<TodayResponse>;
  createHabit(body: HabitCreate): Promise<TodayResponse>;
  completeHabit(habitId: string): Promise<TodayResponse>;
  uncompleteHabit(habitId: string): Promise<TodayResponse>;
  skipHabit(habitId: string): Promise<SkipResponse>;
  submitPlea(sessionId: string, text: string): Promise<PleaResponse>;
  submitRebuttal(sessionId: string, text: string): Promise<RebuttalResponse>;
  getLedger(): Promise<LedgerResponse>;
  getHistory(): Promise<HistoryResponse>;
}
