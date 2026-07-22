/**
 * Provides the ObjectionApi instance derived from current settings.
 * Switching mock/server in Settings swaps the client app-wide.
 */
import React, { createContext, useContext, useMemo } from "react";
import type { ObjectionApi } from "../api/types";
import { createApi } from "../api/createApi";
import { useSettings } from "./SettingsContext";

const ApiContext = createContext<ObjectionApi | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { settings } = useSettings();
  const api = useMemo(
    () => createApi({ serverUrl: settings.serverUrl, useMock: settings.useMock }),
    [settings.serverUrl, settings.useMock],
  );
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): ObjectionApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside ApiProvider");
  return ctx;
}
