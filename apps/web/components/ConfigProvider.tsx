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
import { EMPTY_CONFIG, loadConfig, saveConfig } from "@/lib/config";
import type { AppConfig } from "@/lib/types";

type ConfigContextValue = {
  config: AppConfig;
  open: boolean;
  setOpen: (open: boolean) => void;
  persist: (next: AppConfig) => void;
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const persist = useCallback((next: AppConfig) => {
    setConfig(saveConfig(next));
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ config, open, setOpen, persist }),
    [config, open, persist]
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
