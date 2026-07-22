/**
 * App settings — server URL + toggles, persisted on-device (AsyncStorage).
 * V1 has NO language switch (Persian-only, RTL locked at build time).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const STORAGE_KEY = "objection.settings.v1";

export interface Settings {
  serverUrl: string;
  useMock: boolean;
  reduceMotion: boolean;
}

interface SettingsContextValue {
  settings: Settings;
  hydrated: boolean;
  setServerUrl: (url: string) => void;
  setUseMock: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
}

function defaultServerUrl(): string {
  const extra = Constants.expoConfig?.extra;
  const url = extra ? (extra as Record<string, unknown>)["defaultServerUrl"] : undefined;
  return typeof url === "string" && url.length > 0 ? url : "http://127.0.0.1:8000";
}

const DEFAULTS: Settings = {
  serverUrl: defaultServerUrl(),
  // Mock ON by default so the app is alive on first boot (dev/demo);
  // the owner points it at the real FastAPI server from Settings.
  useMock: true,
  reduceMotion: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed === "object" && parsed !== null) {
            const p = parsed as Partial<Settings>;
            setSettings({
              serverUrl: typeof p.serverUrl === "string" ? p.serverUrl : DEFAULTS.serverUrl,
              useMock: typeof p.useMock === "boolean" ? p.useMock : DEFAULTS.useMock,
              reduceMotion:
                typeof p.reduceMotion === "boolean" ? p.reduceMotion : DEFAULTS.reduceMotion,
            });
          }
        }
      } catch {
        // Corrupt storage → fall back to defaults silently.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Persistence failure must never crash the app.
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      setServerUrl: (url: string) => persist({ ...settings, serverUrl: url.trim() }),
      setUseMock: (useMock: boolean) => persist({ ...settings, useMock }),
      setReduceMotion: (reduceMotion: boolean) => persist({ ...settings, reduceMotion }),
    }),
    [settings, hydrated, persist],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
