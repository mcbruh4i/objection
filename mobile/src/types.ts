export type HabitStatus = "pending" | "completed" | "skipped";
export type CourtState = "awaiting_plea" | "awaiting_rebuttal" | "resolved";
export type VerdictValue = "accepted" | "rejected";
export type ExcuseCategory =
  | "ordinary"
  | "health"
  | "safety"
  | "emergency"
  | "disability"
  | "caregiving"
  | "injection";

export interface Habit {
  id: string;
  title: string;
  minutes: number;
  /** ISO 8601 data from the API; all display formatting happens in the client. */
  deadline_at: string;
  penalty_cents: number;
  status: HabitStatus;
}

export interface SessionSummary {
  id: string;
  state: CourtState;
  prosecutor: ProsecutorResponse | null;
}

export interface TodayResponse {
  habit: Habit;
  habits?: Habit[];
  session: SessionSummary | null;
}

export interface HabitCreatePayload {
  title: string;
  minutes?: number;
  penalty_cents?: number;
  deadline_at?: string;
}

export interface SkipResponse {
  session_id: string;
  state: CourtState;
  created: boolean;
}

export interface ProsecutorResponse {
  objection: string;
  challenge: string;
  question: string;
  emotion: string;
}

export interface JudgeVerdict {
  verdict: VerdictValue;
  reasoning: string;
  fine_multiplier: number;
  should_rule: boolean;
  judge_emotion: string;
  evidence_required: boolean;
  excuse_category: ExcuseCategory;
}

export interface Fine {
  id: string;
  amount_cents: number;
  reason: string;
  created_at: string;
  status: "recorded";
}

export interface PleaResponse {
  session_id: string;
  state: CourtState;
  repeated: boolean;
  prosecutor: ProsecutorResponse;
  source: "live" | "fallback";
}

export interface ContinuingRebuttalResponse {
  session_id: string;
  state: "awaiting_rebuttal";
  should_rule: false;
  prosecutor: ProsecutorResponse;
  source: "live" | "fallback";
}

export interface ResolvedRebuttalResponse {
  session_id: string;
  state: "resolved";
  should_rule: true;
  verdict: JudgeVerdict;
  fine: Fine;
  source: "live" | "fallback" | "absentia";
}

export type RebuttalResponse = ContinuingRebuttalResponse | ResolvedRebuttalResponse;

export interface LedgerEntry {
  id: string;
  amount_cents: number;
  reason: string;
  created_at: string;
  status: "recorded";
}

export interface LedgerResponse {
  balance_cents: number;
  entries: LedgerEntry[];
}

export interface DemoResetResponse {
  today: TodayResponse;
  ledger: LedgerResponse;
}
