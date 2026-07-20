import type {
  DemoResetResponse,
  HabitCreatePayload,
  LedgerResponse,
  PleaResponse,
  RebuttalResponse,
  SkipResponse,
  TodayResponse,
} from "./types";

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * The sole API target for the Expo client. Metro exposes EXPO_PUBLIC_* values
 * to both web and native bundles, so no platform-specific URL logic is needed.
 */
export const API_BASE_URL = configuredUrl?.replace(/\/$/, "") ?? "";
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const COURT_REQUEST_TIMEOUT_MS = 45_000;

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class RequestCancelledError extends Error {
  constructor() {
    super("The request was cancelled.");
    this.name = "RequestCancelledError";
  }
}

export function isRequestCancelled(error: unknown): error is RequestCancelledError {
  return error instanceof RequestCancelledError
    || (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { signal: callerSignal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS }: ApiRequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "EXPO_PUBLIC_API_URL is not configured. Set it to your FastAPI URL, then restart Expo.",
    );
  }

  if (callerSignal?.aborted) {
    throw new RequestCancelledError();
  }

  const timeoutController = new AbortController();
  let timedOut = false;
  const cancelFromCaller = () => timeoutController.abort();
  callerSignal?.addEventListener("abort", cancelFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, Math.max(0, timeoutMs));

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: timeoutController.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        if (response.ok) {
          throw new ApiError("The court server returned an invalid response.", response.status);
        }
      }
    }

    if (!response.ok) {
      const detail =
        typeof payload === "object" && payload !== null && "detail" in payload
          ? String(payload.detail)
          : "The court server could not complete that request.";
      throw new ApiError(detail, response.status);
    }

    return payload as T;
  } catch (requestError) {
    if (requestError instanceof ApiError || requestError instanceof RequestCancelledError) {
      throw requestError;
    }
    if (timedOut) {
      throw new ApiError("The court server took too long to respond. Please try again.");
    }
    if (callerSignal?.aborted || isRequestCancelled(requestError)) {
      throw new RequestCancelledError();
    }
    throw new ApiError("Could not reach the court server. Check your connection and retry.");
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", cancelFromCaller);
  }
}

export const api = {
  getToday: (options?: ApiRequestOptions) => request<TodayResponse>("/today", {}, options),

  createHabit: (payload: HabitCreatePayload, options?: ApiRequestOptions) =>
    request<TodayResponse>("/habits", {
      method: "POST",
      body: JSON.stringify(payload),
    }, options),

  completeHabit: (habitId: string, options?: ApiRequestOptions) =>
    request<TodayResponse>(`/habits/${encodeURIComponent(habitId)}/complete`, {
      method: "POST",
    }, options),

  skipHabit: (habitId: string, options?: ApiRequestOptions) =>
    request<SkipResponse>(`/habits/${encodeURIComponent(habitId)}/skip`, {
      method: "POST",
    }, options),

  submitPlea: (sessionId: string, text: string, options?: ApiRequestOptions) =>
    request<PleaResponse>(`/court/${encodeURIComponent(sessionId)}/plea`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }, { timeoutMs: COURT_REQUEST_TIMEOUT_MS, ...options }),

  submitRebuttal: (sessionId: string, text: string, options?: ApiRequestOptions) =>
    request<RebuttalResponse>(`/court/${encodeURIComponent(sessionId)}/rebuttal`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }, { timeoutMs: COURT_REQUEST_TIMEOUT_MS, ...options }),

  getLedger: (options?: ApiRequestOptions) => request<LedgerResponse>("/ledger", {}, options),

  resetDemo: (options?: ApiRequestOptions) => request<DemoResetResponse>("/demo/reset", { method: "POST" }, options),
};
