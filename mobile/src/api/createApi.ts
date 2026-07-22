/**
 * API factory — the single place the app decides between the real HTTP
 * client and the in-memory mock (Settings → «دادهٔ آزمایشی»).
 */
import type { ObjectionApi } from "./types";
import { createHttpApi } from "./client";
import { createMockApi } from "./mock";

export interface ApiConfig {
  serverUrl: string;
  useMock: boolean;
}

export function createApi(config: ApiConfig): ObjectionApi {
  return config.useMock ? createMockApi() : createHttpApi(config.serverUrl);
}
