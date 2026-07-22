/**
 * Typed fetch client for the Objection! FastAPI backend (v2 contract).
 *
 * - Court endpoints get a long timeout: the prosecutor/judge are LLM calls.
 * - FastAPI errors arrive as { detail: string } (English) — wrapped in
 *   ApiError with the HTTP status so the UI can map them to Persian copy.
 */
import type {
  HabitCreate,
  HistoryResponse,
  LedgerResponse,
  ObjectionApi,
  PleaResponse,
  RebuttalResponse,
  SkipResponse,
  TodayResponse,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly kind: "http" | "network" | "timeout";

  constructor(kind: "http" | "network" | "timeout", status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
/** Plea/rebuttal wait on a live LLM; the UI shows explicit loading states. */
const COURT_TIMEOUT_MS = 120_000;

async function request<T>(
  baseUrl: string,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: init.method,
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("timeout", 0, "Request timed out.");
    }
    throw new ApiError("network", 0, "Network request failed.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload: unknown = await response.json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof (payload as { detail: unknown }).detail === "string"
      ) {
        detail = (payload as { detail: string }).detail;
      }
    } catch {
      // keep the fallback detail
    }
    throw new ApiError("http", response.status, detail);
  }

  return (await response.json()) as T;
}

export function createHttpApi(baseUrl: string): ObjectionApi {
  return {
    health: () => request<{ status: string }>(baseUrl, "/health", { method: "GET" }),
    getToday: () => request<TodayResponse>(baseUrl, "/today", { method: "GET" }),
    createHabit: (body: HabitCreate) =>
      request<TodayResponse>(baseUrl, "/habits", { method: "POST", body }),
    completeHabit: (habitId: string) =>
      request<TodayResponse>(baseUrl, `/habits/${encodeURIComponent(habitId)}/complete`, {
        method: "POST",
      }),
    uncompleteHabit: (habitId: string) =>
      request<TodayResponse>(baseUrl, `/habits/${encodeURIComponent(habitId)}/uncomplete`, {
        method: "POST",
      }),
    skipHabit: (habitId: string) =>
      request<SkipResponse>(baseUrl, `/habits/${encodeURIComponent(habitId)}/skip`, {
        method: "POST",
      }),
    submitPlea: (sessionId: string, text: string) =>
      request<PleaResponse>(baseUrl, `/court/${encodeURIComponent(sessionId)}/plea`, {
        method: "POST",
        body: { text },
        timeoutMs: COURT_TIMEOUT_MS,
      }),
    submitRebuttal: (sessionId: string, text: string) =>
      request<RebuttalResponse>(baseUrl, `/court/${encodeURIComponent(sessionId)}/rebuttal`, {
        method: "POST",
        body: { text },
        timeoutMs: COURT_TIMEOUT_MS,
      }),
    getLedger: () => request<LedgerResponse>(baseUrl, "/ledger", { method: "GET" }),
    getHistory: () => request<HistoryResponse>(baseUrl, "/history", { method: "GET" }),
  };
}
