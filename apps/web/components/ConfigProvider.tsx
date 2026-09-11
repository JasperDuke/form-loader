"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_CONFIG, loadConfig, saveAdditionalPayload, saveConfig } from "@/lib/config";
import type { AppConfig, PayloadPair } from "@/lib/types";

type ConfigContextValue = {
  config: AppConfig;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  payloadOpen: boolean;
  setPayloadOpen: (open: boolean) => void;
  persist: (next: AppConfig) => Promise<void>;
  persistPayload: (pairs: PayloadPair[]) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [payloadOpen, setPayloadOpen] = useState(false);

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: AppConfig) => {
    const saved = await saveConfig(next);
    setConfig(saved);
    setOpen(false);
  }, []);

  const persistPayload = useCallback(async (pairs: PayloadPair[]) => {
    const saved = await saveAdditionalPayload(pairs);
    setConfig(saved);
    setPayloadOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
      open,
      setOpen,
      payloadOpen,
      setPayloadOpen,
      persist,
      persistPayload,
    }),
    [config, loading, open, payloadOpen, persist, persistPayload]
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
