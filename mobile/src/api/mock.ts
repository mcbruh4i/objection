/**
 * In-memory mock of the v2 backend — same ObjectionApi surface, same rules
 * (status transitions, 409s, multi-round court, integer-cents fines), plus
 * simulated latency so every loading state is visible during development.
 *
 * The mock's Persian court lines are intentionally LONG in places to prove
 * the UI never clips long RTL strings (API contract requirement).
 */
import type {
  Fine,
  Habit,
  HabitCreate,
  HistoryResponse,
  LedgerResponse,
  ObjectionApi,
  PleaResponse,
  ProsecutorResponse,
  RebuttalResponse,
  SessionSummary,
  TodayResponse,
} from "./types";
import { MAX_HABITS_PER_DAY } from "./types";
import { ApiError } from "./client";
import { buildMockSeed } from "./fixtures";

interface MockSession {
  id: string;
  habit_id: string;
  state: SessionSummary["state"];
  plea: string | null;
  prosecutor: ProsecutorResponse | null;
  rounds: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

function utcEndOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(23, 59, 0, 0);
  return d.toISOString();
}

let uid = 0;
function mockId(prefix: string): string {
  uid += 1;
  return `${prefix}-mock-${uid}`;
}

const PROSECUTOR_ROUNDS: readonly ProsecutorResponse[] = [
  {
    objection: "OBJECTION!",
    challenge:
      "جناب قاضی، متهم ادعا می‌کنه «وقت نداشتم»! همون قولی که خودش با دست خودش، با مهلت مشخص و جریمه‌ی مشخص ثبت کرده. کسی که وقتِ دادن قول رو داره، وقتِ عمل‌کردن بهش رو هم داره. این دفاع نیست، فراره!",
    question: "دقیقاً بگو بین ساعت چند تا چند «وقت نداشتی» و اون وسط چی‌کار می‌کردی؟",
    emotion: "objection",
  },
  {
    objection: "OBJECTION!",
    challenge:
      "شنیدید جناب قاضی؟ حالا می‌گه «خسته بودم». خستگی بهانه‌ی همیشگیِ همین متهمه — پرونده‌ش پُره از همین حرف‌ها. آدمِ خسته پنج دقیقه هم می‌تونه شروع کنه؛ شروع‌نکردن انتخابه، نه خستگی!",
    question: "اگه فقط پنج دقیقه شروع می‌کردی چی می‌شد؟ چرا حتی شروع نکردی؟",
    emotion: "smug",
  },
] as const;

const JUDGE_ACCEPT_REASONING =
  "دادگاه پس از بررسی اظهارات طرفین، عذر مطرح‌شده را موجه تشخیص می‌دهد. سلامت مقدم بر تعهد است و مدارک رفتاری متهم نشان از حسن نیت دارد. پرونده بدون جریمه مختومه اعلام می‌شود؛ لیکن دادگاه تأکید می‌کند که تکرار این وضعیت مسموع نخواهد بود.";

const JUDGE_REJECT_REASONING =
  "دادگاه دفاعیات متهم را مقنع تشخیص نمی‌دهد. تعهدی که با اختیار کامل ثبت شده است، با بهانه‌های کلی و تکراری ساقط نمی‌شود. نظر به سابقه‌ی پرونده و فقدان دلیل موجه، دادگاه متهم را مقصر شناخته و جریمه‌ی مقرر را قطعی اعلام می‌کند.";

const HEALTH_HINTS = ["مریض", "بیمار", "درد", "تب", "دکتر", "بیمارستان"] as const;

export function createMockApi(): ObjectionApi {
  const seed = buildMockSeed();
  const habits: Habit[] = seed.habits;
  const fines: Fine[] = seed.fines;
  const history: HistoryResponse = seed.history;
  const sessions = new Map<string, MockSession>();

  function openSessionFor(habitId: string): MockSession | undefined {
    for (const session of sessions.values()) {
      if (
        session.habit_id === habitId &&
        (session.state === "awaiting_plea" || session.state === "awaiting_rebuttal")
      ) {
        return session;
      }
    }
    return undefined;
  }

  function anyOpenSession(): MockSession | undefined {
    for (const session of sessions.values()) {
      if (session.state === "awaiting_plea" || session.state === "awaiting_rebuttal") {
        return session;
      }
    }
    return undefined;
  }

  function today(): TodayResponse {
    const open = anyOpenSession();
    const primary = habits.find((h) => h.status === "pending") ?? habits[0];
    if (!primary) throw new ApiError("http", 500, "Seeded habit is missing.");
    return {
      habit: primary,
      habits: [...habits],
      session: open
        ? {
            id: open.id,
            state: open.state,
            habit_id: open.habit_id,
            prosecutor: open.prosecutor,
          }
        : null,
    };
  }

  return {
    async health() {
      await delay(120);
      return { status: "ok" };
    },

    async getToday() {
      await delay(350);
      return today();
    },

    async createHabit(body: HabitCreate) {
      await delay(400);
      const title = body.title.trim();
      if (title.length === 0) throw new ApiError("http", 422, "The promise needs a name.");
      if (habits.length >= MAX_HABITS_PER_DAY) {
        throw new ApiError(
          "http",
          409,
          `The docket is full: ${MAX_HABITS_PER_DAY} promises per day at most.`,
        );
      }
      habits.push({
        id: mockId("habit"),
        title,
        minutes: body.minutes ?? 30,
        deadline_at: body.deadline_at ?? utcEndOfTodayIso(),
        // Mirrors the app's daily default (state/cadenceStore.ts).
        penalty_cents: body.penalty_cents ?? 8_000,
        status: "pending",
      });
      return today();
    },

    async completeHabit(habitId: string) {
      await delay(280);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) throw new ApiError("http", 404, "Habit not found.");
      if (habit.status === "skipped" && openSessionFor(habitId)) {
        throw new ApiError("http", 409, "A court session is already open for this habit.");
      }
      habit.status = "completed";
      return today();
    },

    async uncompleteHabit(habitId: string) {
      await delay(280);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) throw new ApiError("http", 404, "Habit not found.");
      if (habit.status === "completed") habit.status = "pending";
      return today();
    },

    async skipHabit(habitId: string) {
      await delay(320);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) throw new ApiError("http", 404, "Habit not found.");
      if (habit.status === "completed") {
        throw new ApiError("http", 409, "This habit has already been completed.");
      }
      const existing = openSessionFor(habitId);
      if (existing) {
        return { session_id: existing.id, state: existing.state, created: false };
      }
      habit.status = "skipped";
      const session: MockSession = {
        id: mockId("session"),
        habit_id: habitId,
        state: "awaiting_plea",
        plea: null,
        prosecutor: null,
        rounds: 0,
      };
      sessions.set(session.id, session);
      return { session_id: session.id, state: session.state, created: true };
    },

    async submitPlea(sessionId: string, text: string): Promise<PleaResponse> {
      await delay(1400); // visible "prosecutor is reading" state
      const session = sessions.get(sessionId);
      if (!session) throw new ApiError("http", 404, "Court session not found.");
      if (session.state === "awaiting_rebuttal" && session.prosecutor) {
        return {
          session_id: sessionId,
          state: "awaiting_rebuttal",
          repeated: false,
          prosecutor: session.prosecutor,
          source: "fallback",
        };
      }
      if (session.state !== "awaiting_plea") {
        throw new ApiError("http", 409, "This court session is already resolved.");
      }
      session.plea = text;
      session.state = "awaiting_rebuttal";
      session.prosecutor = PROSECUTOR_ROUNDS[0] as ProsecutorResponse;
      session.rounds = 1;
      return {
        session_id: sessionId,
        state: "awaiting_rebuttal",
        repeated: false,
        prosecutor: session.prosecutor,
        source: "fallback",
      };
    },

    async submitRebuttal(sessionId: string, text: string): Promise<RebuttalResponse> {
      await delay(1600); // visible "court deliberating" state
      const session = sessions.get(sessionId);
      if (!session) throw new ApiError("http", 404, "Court session not found.");
      if (session.state !== "awaiting_rebuttal" || session.plea === null) {
        throw new ApiError("http", 409, "The plea must be heard before a rebuttal.");
      }

      // Round 1 → prosecutor presses once more; round 2 → the judge rules.
      if (session.rounds < 2) {
        session.rounds += 1;
        session.prosecutor = PROSECUTOR_ROUNDS[1] as ProsecutorResponse;
        return {
          session_id: sessionId,
          state: "awaiting_rebuttal",
          should_rule: false,
          prosecutor: session.prosecutor,
          source: "fallback",
        };
      }

      const habit = habits.find((h) => h.id === session.habit_id);
      const penalty = habit?.penalty_cents ?? 8_000;
      const testimony = `${session.plea} ${text}`;
      const accepted = HEALTH_HINTS.some((hint) => testimony.includes(hint));

      session.state = "resolved";
      const fine: Fine = {
        id: mockId("fine"),
        amount_cents: accepted ? 0 : penalty,
        reason: accepted ? "Case accepted — no mock fine." : "Court rejected a repeated excuse.",
        created_at: nowIso(),
        status: "recorded",
      };
      fines.unshift(fine);

      return {
        session_id: sessionId,
        state: "resolved",
        should_rule: true,
        verdict: {
          verdict: accepted ? "accepted" : "rejected",
          reasoning: accepted ? JUDGE_ACCEPT_REASONING : JUDGE_REJECT_REASONING,
          fine_multiplier: accepted ? 0 : 1,
          should_rule: true,
          judge_emotion: accepted ? "neutral" : "stern",
          evidence_required: false,
          excuse_category: accepted ? "health" : "ordinary",
        },
        fine,
        source: "fallback",
      };
    },

    async getLedger(): Promise<LedgerResponse> {
      await delay(300);
      return {
        balance_cents: fines.reduce((sum, f) => sum + f.amount_cents, 0),
        entries: [...fines],
      };
    },

    async getHistory(): Promise<HistoryResponse> {
      await delay(300);
      return { days: [...history.days] };
    },
  };
}
